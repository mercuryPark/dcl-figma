// UI entry — runs inside the plugin iframe. Talks to the sandbox via parent.postMessage.
// Locales are inlined at build time via esbuild's `define` (see build.mjs).

import { detectLocale, setLocale, t, availableLocales } from "../i18n";
import { createReceiveState, handleMessage } from "./receive";
import type { TransportMessage } from "../transport/chunk";

declare const __LOCALES__: Record<string, unknown>;
// Touch the identifier so esbuild always emits a reference (otherwise tree-shaking may drop it
// when this module only imports i18n internals).
(void 0, __LOCALES__);

type Scope = "selection" | "currentPage" | "allPages";

interface UiState {
  fileKey: string | null;
  fileName: string;
  pageName: string;
  pageId: string;
  selectionCount: number;
  processed: number;
  total: number;
  phase: string;
  scope: Scope;
  includeSvg: boolean;
  includeHidden: boolean;
  includeTokens: boolean;
  slim: string | null;
  full: string | null;
  slimBytes: number;
  fullBytes: number;
  slimFilename: string;
  fullFilename: string;
  dumpRequestId: string | null;
  warnings: { variablesError: boolean; svgFailed: number; degraded: string[] } | null;
}

const state: UiState = {
  fileKey: null,
  fileName: "",
  pageName: "",
  pageId: "",
  selectionCount: 0,
  processed: 0,
  total: 0,
  phase: "idle",
  scope: "currentPage",
  includeSvg: false,
  includeHidden: false,
  includeTokens: true,
  slim: null,
  full: null,
  slimBytes: 0,
  fullBytes: 0,
  slimFilename: "",
  fullFilename: "",
  dumpRequestId: null,
  warnings: null
};

const receive = createReceiveState();

// --- DOM -------------------------------------------------------------------

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el as T;
};

const els = {
  title: $("#app-title"),
  subtitle: $("#app-subtitle"),
  localeButtons: Array.from(document.querySelectorAll<HTMLButtonElement>(".locale-toggle button")),
  scopeLegend: $("#scope-legend"),
  scopeRadios: Array.from(document.querySelectorAll<HTMLInputElement>("input[name='scope']")),
  selectionLabel: document.querySelector("[data-i18n-selection]") as HTMLElement,
  advancedSummary: document.querySelector("details summary") as HTMLElement,
  optSvg: $("#opt-svg") as HTMLInputElement,
  optHidden: $("#opt-hidden") as HTMLInputElement,
  optTokens: $("#opt-tokens") as HTMLInputElement,
  btnDump: $("#btn-dump") as HTMLButtonElement,
  progressFill: $("#progress-fill"),
  progressBar: $("#progress-bar"),
  phaseLabel: $("#phase-label"),
  warningList: $("#warning-list"),
  errorBanner: $("#error-banner"),
  results: $("#results"),
  btnDownloadSlim: $("#btn-download-slim") as HTMLButtonElement,
  btnDownloadFull: $("#btn-download-full") as HTMLButtonElement,
  btnCopySlim: $("#btn-copy-slim") as HTMLButtonElement,
  i18nNodes: Array.from(document.querySelectorAll<HTMLElement>("[data-i18n]"))
};

// --- i18n ------------------------------------------------------------------

function applyI18n(): void {
  els.title.textContent = t("app.title");
  els.subtitle.textContent = t("app.subtitle");
  els.scopeLegend.textContent = t("scope.legend");
  els.advancedSummary.textContent = t("advanced.toggle");
  for (const n of els.i18nNodes) {
    const key = n.getAttribute("data-i18n");
    if (key) n.textContent = t(key);
  }
  els.selectionLabel.textContent = t("scope.selection", { count: state.selectionCount, plural: state.selectionCount === 1 ? "" : "s" });
  els.btnDump.textContent = t("actions.dump");
  updateResultsLabels();
  updatePhaseLabel();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function updateResultsLabels(): void {
  els.btnDownloadSlim.textContent = t("actions.downloadSlim", { size: formatBytes(state.slimBytes) });
  els.btnDownloadFull.textContent = t("actions.downloadFull", { size: formatBytes(state.fullBytes) });
  els.btnCopySlim.textContent = t("actions.copySlim");
}

function updatePhaseLabel(): void {
  els.phaseLabel.textContent = t(`phase.${state.phase}`);
}

// --- messaging -------------------------------------------------------------

function send(msg: unknown): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

window.onmessage = (event: MessageEvent) => {
  const msg = (event.data as { pluginMessage?: unknown }).pluginMessage;
  if (!msg || typeof msg !== "object") return;
  const m = msg as { type?: string } & Record<string, unknown>;

  if (m.type === "context") {
    state.fileName = (m.fileName as string) ?? "";
    state.pageName = (m.pageName as string) ?? "";
    state.pageId = (m.pageId as string) ?? "";
    state.selectionCount = (m.selectionCount as number) ?? 0;
    applyI18n();
    applySmartDefaults();
    return;
  }

  if (m.type === "selection") {
    state.selectionCount = (m.selectionCount as number) ?? 0;
    els.selectionLabel.textContent = t("scope.selection", { count: state.selectionCount, plural: state.selectionCount === 1 ? "" : "s" });
    return;
  }

  if (m.type === "phase") {
    state.phase = (m.phase as string) ?? "idle";
    updatePhaseLabel();
    return;
  }

  if (m.type === "progress") {
    state.processed = (m.processed as number) ?? 0;
    renderProgress();
    return;
  }

  if (m.type === "dumpReady") {
    state.slimBytes = (m.slimBytes as number) ?? 0;
    state.fullBytes = (m.fullBytes as number) ?? 0;
    state.slimFilename = (m.slimFilename as string) ?? "";
    state.fullFilename = (m.fullFilename as string) ?? "";
    state.warnings = (m.warnings as UiState["warnings"]) ?? null;
    updateResultsLabels();
    renderWarnings();
    return;
  }

  if (m.type === "error") {
    const code = (m.code as string) ?? "generic";
    showError(t(`errors.${code}`));
    return;
  }

  // Transport: chunk / done.
  if (m.type === "chunk" || m.type === "done") {
    const res = handleMessage(receive, m as unknown as TransportMessage);
    if (res.error) {
      showError(t("errors.transport") + " (" + res.error + ")");
      return;
    }
    if (res.done && res.assembled && res.kind) {
      if (res.kind === "slim") state.slim = res.assembled;
      else state.full = res.assembled;
      if (state.slim && state.full) enableResults();
    }
  }
};

// --- UI wiring -------------------------------------------------------------

function renderProgress(): void {
  const pct = state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0;
  els.progressFill.style.width = `${pct}%`;
  els.progressBar.setAttribute("aria-valuenow", String(pct));
}

function applySmartDefaults(): void {
  if (state.selectionCount > 0) {
    for (const r of els.scopeRadios) r.checked = r.value === "selection";
    state.scope = "selection";
  } else {
    for (const r of els.scopeRadios) r.checked = r.value === "currentPage";
    state.scope = "currentPage";
  }
}

function clearResults(): void {
  state.slim = null;
  state.full = null;
  state.warnings = null;
  els.results.classList.remove("active");
  els.errorBanner.classList.remove("active");
  els.warningList.classList.remove("active");
  els.warningList.innerHTML = "";
}

function enableResults(): void {
  els.results.classList.add("active");
  els.btnDownloadSlim.disabled = false;
  els.btnDownloadFull.disabled = false;
  els.btnCopySlim.disabled = false;
}

function renderWarnings(): void {
  if (!state.warnings) return;
  const items: string[] = [];
  if (state.warnings.variablesError) items.push(t("warnings.variablesError"));
  if (state.warnings.svgFailed > 0) items.push(t("warnings.svgFailed", { count: state.warnings.svgFailed, plural: state.warnings.svgFailed === 1 ? "" : "s" }));
  if (state.warnings.degraded.length > 0) items.push(t("warnings.degraded", { stages: state.warnings.degraded.join(", ") }));
  if (items.length) {
    els.warningList.innerHTML = `<strong>${t("warnings.count", { count: items.length, plural: items.length === 1 ? "" : "s" })}</strong><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    els.warningList.classList.add("active");
  }
}

function showError(msg: string): void {
  els.errorBanner.textContent = msg;
  els.errorBanner.classList.add("active");
  els.btnDump.disabled = false;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] ?? ch));
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// Locale toggle.
for (const b of els.localeButtons) {
  b.addEventListener("click", () => {
    const code = b.getAttribute("data-locale") ?? "en";
    setLocale(code);
    for (const other of els.localeButtons) {
      other.setAttribute("aria-pressed", other === b ? "true" : "false");
    }
    persistOptions();
    applyI18n();
  });
}

for (const r of els.scopeRadios) {
  r.addEventListener("change", () => {
    if (r.checked) {
      state.scope = r.value as Scope;
      persistOptions();
    }
  });
}

els.optSvg.addEventListener("change", () => { state.includeSvg = els.optSvg.checked; persistOptions(); });
els.optHidden.addEventListener("change", () => { state.includeHidden = els.optHidden.checked; persistOptions(); });
els.optTokens.addEventListener("change", () => { state.includeTokens = els.optTokens.checked; persistOptions(); });

els.btnDump.addEventListener("click", () => {
  clearResults();
  state.dumpRequestId = String(Date.now());
  receive.buffers.slim.length = 0;
  receive.buffers.full.length = 0;
  receive.completed.slim = false;
  receive.completed.full = false;
  send({
    type: "dump",
    scope: state.scope,
    includeHidden: state.includeHidden,
    includeTokens: state.includeTokens,
    includeSvg: state.includeSvg,
    requestId: state.dumpRequestId
  });
});

els.btnDownloadSlim.addEventListener("click", () => {
  if (state.slim) downloadText(state.slimFilename, state.slim);
});
els.btnDownloadFull.addEventListener("click", () => {
  if (state.full) downloadText(state.fullFilename, state.full);
});
els.btnCopySlim.addEventListener("click", () => {
  if (!state.slim) return;
  copyToClipboard(state.slim);
  const original = els.btnCopySlim.textContent;
  els.btnCopySlim.textContent = t("actions.copied");
  setTimeout(() => { els.btnCopySlim.textContent = original ?? t("actions.copySlim"); }, 2000);
});

// --- clientStorage persistence (per-file) ---------------------------------
// The sandbox owns clientStorage access; UI sends intent messages, but for v1.0 we
// store UI preferences in localStorage keyed by fileKey+fileName pseudo id.
// (figma.clientStorage is only reachable from the sandbox; when the sandbox exposes it
// we mirror here.)

function optionsKey(): string {
  return `dcfl:options:${state.fileName}`;
}

function persistOptions(): void {
  try {
    localStorage.setItem(
      optionsKey(),
      JSON.stringify({
        locale: getCurrentLocale(),
        scope: state.scope,
        includeSvg: state.includeSvg,
        includeHidden: state.includeHidden,
        includeTokens: state.includeTokens
      })
    );
  } catch { /* quota / disabled — ignore */ }
}

function getCurrentLocale(): string {
  const pressed = els.localeButtons.find((b) => b.getAttribute("aria-pressed") === "true");
  return pressed?.getAttribute("data-locale") ?? "en";
}

function loadPersisted(): void {
  try {
    const raw = localStorage.getItem(optionsKey());
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<{
      locale: string; scope: Scope; includeSvg: boolean; includeHidden: boolean; includeTokens: boolean;
    }>;
    if (parsed.scope) state.scope = parsed.scope;
    if (typeof parsed.includeSvg === "boolean") { state.includeSvg = parsed.includeSvg; els.optSvg.checked = parsed.includeSvg; }
    if (typeof parsed.includeHidden === "boolean") { state.includeHidden = parsed.includeHidden; els.optHidden.checked = parsed.includeHidden; }
    if (typeof parsed.includeTokens === "boolean") { state.includeTokens = parsed.includeTokens; els.optTokens.checked = parsed.includeTokens; }
    if (parsed.locale && availableLocales().includes(parsed.locale)) {
      setLocale(parsed.locale);
      for (const b of els.localeButtons) {
        b.setAttribute("aria-pressed", b.getAttribute("data-locale") === parsed.locale ? "true" : "false");
      }
    }
    for (const r of els.scopeRadios) r.checked = r.value === state.scope;
  } catch { /* ignore corrupt JSON */ }
}

// --- init ------------------------------------------------------------------

function init(): void {
  const detected = detectLocale(navigator.language ?? "en", null);
  setLocale(detected);
  for (const b of els.localeButtons) {
    b.setAttribute("aria-pressed", b.getAttribute("data-locale") === detected ? "true" : "false");
  }
  loadPersisted();
  applyI18n();
  send({ type: "initDone" });
}

init();
