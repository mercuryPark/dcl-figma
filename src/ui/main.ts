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

interface DumpRequest {
  type: "dump";
  scope: Scope;
  includeHidden: boolean;
  includeTokens: boolean;
  includeSvg: boolean;
  requestId: string;
}

interface PersistedOptions {
  locale?: string;
  scope?: Scope;
  includeSvg?: boolean;
  includeHidden?: boolean;
  includeTokens?: boolean;
}

interface WarningState {
  variablesError: boolean;
  svgFailed: number;
  svgCapped: number;
  styleError: string;
  degraded: string[];
}

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
  warnings: WarningState | null;
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
let lastDumpRequest: DumpRequest | null = null;
let optionsSyncStarted = false;
let pendingMigration: { key: string } | null = null;

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
  btnCancel: $("#btn-cancel") as HTMLButtonElement,
  progressFill: $("#progress-fill"),
  progressBar: $("#progress-bar"),
  phaseLabel: $("#phase-label"),
  warningList: $("#warning-list"),
  errorBanner: $("#error-banner"),
  errorMessage: $("#error-message"),
  btnRetry: $("#btn-retry") as HTMLButtonElement,
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
  for (const n of Array.from(document.querySelectorAll<HTMLElement>("[data-i18n-aria]"))) {
    const key = n.getAttribute("data-i18n-aria");
    if (key) n.setAttribute("aria-label", t(key));
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
  const base = t(`phase.${state.phase}`);
  if (state.phase === "traversing" && state.processed > 0) {
    els.phaseLabel.textContent = `${base} (${state.processed})`;
  } else {
    els.phaseLabel.textContent = base;
  }
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
    state.fileKey = (m.fileKey as string | null) ?? null;
    state.fileName = (m.fileName as string) ?? "";
    state.pageName = (m.pageName as string) ?? "";
    state.pageId = (m.pageId as string) ?? "";
    state.selectionCount = (m.selectionCount as number) ?? 0;
    applyI18n();
    applySmartDefaults();
    startOptionsSync();
    return;
  }

  if (m.type === "selection") {
    state.selectionCount = (m.selectionCount as number) ?? 0;
    els.selectionLabel.textContent = t("scope.selection", { count: state.selectionCount, plural: state.selectionCount === 1 ? "" : "s" });
    return;
  }

  if (m.type === "phase") {
    state.phase = (m.phase as string) ?? "idle";
    if (state.phase === "idle" || state.phase === "loadingPages") state.processed = 0;
    // idle is a terminal state used by both successful completion (post-done) and cancellation;
    // either way the primary button should re-enable so the user is never locked out.
    if (state.phase === "done" || state.phase === "idle") els.btnDump.disabled = false;
    renderProgress();
    updateCancelVisibility();
    updatePhaseLabel();
    return;
  }

  if (m.type === "progress") {
    state.processed = (m.processed as number) ?? 0;
    renderProgress();
    updatePhaseLabel();
    return;
  }

  if (m.type === "dumpReady") {
    state.slimBytes = (m.slimBytes as number) ?? 0;
    state.fullBytes = (m.fullBytes as number) ?? 0;
    state.slimFilename = (m.slimFilename as string) ?? "";
    state.fullFilename = (m.fullFilename as string) ?? "";
    state.warnings = normalizeWarnings(m.warnings);
    updateResultsLabels();
    renderWarnings();
    return;
  }

  if (m.type === "error") {
    const code = (m.code as string) ?? "generic";
    showError(t(`errors.${code}`));
    return;
  }

  if (m.type === "options") {
    applyPersistedOptions(normalizeOptions(m.payload));
    applyI18n();
    return;
  }

  if (m.type === "optionsMigrated") {
    if (pendingMigration) {
      try { localStorage.removeItem(pendingMigration.key); } catch { /* ignore */ }
      pendingMigration = null;
    }
    send({ type: "loadOptions" });
    return;
  }

  if (m.type === "optionsSaved") {
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

// Phase-based progress mapping. The sandbox does not pre-compute total node count, so we
// approximate progress with phase boundaries and let the traversing phase grow with the
// processed counter via an asymptotic curve (so the bar always moves but never overshoots).
const PHASE_PERCENT = {
  idle: 0,
  loadingPages: 5,
  traversing: 25,
  collectingStyles: 65,
  collectingVariables: 72,
  exportingSvg: 80,
  buildingSlim: 90,
  sending: 95,
  done: 100
} as const;
const TRAVERSE_MIN = 25;
const TRAVERSE_MAX = 60;
const RUNNING_PHASES = new Set(["loadingPages", "traversing", "collectingStyles", "collectingVariables", "exportingSvg", "buildingSlim", "sending"]);

function renderProgress(): void {
  let pct: number = PHASE_PERCENT[state.phase as keyof typeof PHASE_PERCENT] ?? 0;
  if (state.phase === "traversing" && state.processed > 0) {
    const k = state.processed / (state.processed + 500);
    pct = Math.round(TRAVERSE_MIN + (TRAVERSE_MAX - TRAVERSE_MIN) * k);
  }
  els.progressFill.style.width = `${pct}%`;
  els.progressBar.setAttribute("aria-valuenow", String(pct));
}

function updateCancelVisibility(): void {
  els.btnCancel.classList.toggle("hidden", !RUNNING_PHASES.has(state.phase));
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
  els.errorMessage.textContent = "";
  els.btnRetry.classList.add("hidden");
  els.warningList.classList.remove("active");
  els.warningList.innerHTML = "";
}

function enableResults(): void {
  els.results.classList.add("active");
  els.btnDownloadSlim.disabled = false;
  els.btnDownloadFull.disabled = false;
  els.btnCopySlim.disabled = false;
  els.btnDump.disabled = false;
}

function renderWarnings(): void {
  if (!state.warnings) return;
  const items: string[] = [];
  if (state.warnings.variablesError) items.push(t("warnings.variablesError"));
  if (state.warnings.svgFailed > 0) items.push(t("warnings.svgFailed", { count: state.warnings.svgFailed, plural: state.warnings.svgFailed === 1 ? "" : "s" }));
  if (state.warnings.svgCapped > 0) items.push(t("warnings.svgCapped", { count: state.warnings.svgCapped, plural: state.warnings.svgCapped === 1 ? "" : "s" }));
  if (state.warnings.styleError) items.push(t("warnings.styleError", { error: state.warnings.styleError }));
  if (state.warnings.degraded.length > 0) items.push(t("warnings.degraded", { stages: state.warnings.degraded.join(", ") }));
  if (items.length) {
    els.warningList.innerHTML = `<strong>${t("warnings.count", { count: items.length, plural: items.length === 1 ? "" : "s" })}</strong><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    els.warningList.classList.add("active");
  }
}

function normalizeWarnings(raw: unknown): WarningState | null {
  if (raw === null || typeof raw !== "object") return null;
  const source = raw as Partial<WarningState>;
  return {
    variablesError: source.variablesError === true,
    svgFailed: typeof source.svgFailed === "number" ? source.svgFailed : 0,
    svgCapped: typeof source.svgCapped === "number" ? source.svgCapped : 0,
    styleError: typeof source.styleError === "string" ? source.styleError : "",
    degraded: Array.isArray(source.degraded) ? source.degraded.filter((v): v is string => typeof v === "string") : []
  };
}

function showError(msg: string): void {
  els.errorMessage.textContent = msg;
  els.btnRetry.classList.toggle("hidden", !lastDumpRequest);
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
  if (els.btnDump.disabled) return;
  startDump(buildDumpRequest());
});

els.btnCancel.addEventListener("click", () => {
  send({ type: "cancel" });
});

els.btnRetry.addEventListener("click", () => {
  if (!lastDumpRequest) return;
  startDump(lastDumpRequest);
});

function buildDumpRequest(): DumpRequest {
  return {
    type: "dump",
    scope: state.scope,
    includeHidden: state.includeHidden,
    includeTokens: state.includeTokens,
    includeSvg: state.includeSvg,
    requestId: String(Date.now())
  };
}

function resetReceiveBuffers(): void {
  receive.buffers.slim.length = 0;
  receive.buffers.full.length = 0;
  receive.completed.slim = false;
  receive.completed.full = false;
}

function startDump(request: DumpRequest): void {
  els.btnDump.disabled = true;
  clearResults();
  state.processed = 0;
  state.phase = "loadingPages";
  renderProgress();
  updateCancelVisibility();
  updatePhaseLabel();
  state.dumpRequestId = request.requestId;
  lastDumpRequest = request;
  resetReceiveBuffers();
  send(request);
}

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
// The sandbox owns clientStorage access; UI sends intent messages and only touches
// localStorage once to migrate v0.2 per-file preferences.

function optionsKey(): string {
  return `dcfl:options:${state.fileKey ?? state.fileName}`;
}

function serializeOptions(): PersistedOptions {
  return {
    locale: getCurrentLocale(),
    scope: state.scope,
    includeSvg: state.includeSvg,
    includeHidden: state.includeHidden,
    includeTokens: state.includeTokens
  };
}

function persistOptions(): void {
  send({ type: "saveOptions", payload: serializeOptions() });
}

function getCurrentLocale(): string {
  const pressed = els.localeButtons.find((b) => b.getAttribute("aria-pressed") === "true");
  return pressed?.getAttribute("data-locale") ?? "en";
}

function normalizeOptions(raw: unknown): PersistedOptions | null {
  if (raw === null || typeof raw !== "object") return null;
  const source = raw as Partial<PersistedOptions>;
  const out: PersistedOptions = {};
  if (typeof source.locale === "string") out.locale = source.locale;
  if (source.scope === "selection" || source.scope === "currentPage" || source.scope === "allPages") out.scope = source.scope;
  if (typeof source.includeSvg === "boolean") out.includeSvg = source.includeSvg;
  if (typeof source.includeHidden === "boolean") out.includeHidden = source.includeHidden;
  if (typeof source.includeTokens === "boolean") out.includeTokens = source.includeTokens;
  return Object.keys(out).length ? out : null;
}

function applyPersistedOptions(parsed: PersistedOptions | null): void {
  if (!parsed) return;
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
}

function readLegacyOptions(): { key: string; payload: PersistedOptions } | null {
  try {
    const key = optionsKey();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = normalizeOptions(JSON.parse(raw));
    if (!payload) return null;
    return { key, payload };
  } catch { /* ignore corrupt JSON */ }
  return null;
}

function startOptionsSync(): void {
  if (optionsSyncStarted) return;
  optionsSyncStarted = true;
  const legacy = readLegacyOptions();
  if (legacy) {
    applyPersistedOptions(legacy.payload);
    applyI18n();
    pendingMigration = { key: legacy.key };
    send({ type: "migrateOptions", payload: legacy.payload });
    return;
  }
  send({ type: "loadOptions" });
}

// --- init ------------------------------------------------------------------

function init(): void {
  const detected = detectLocale(navigator.language ?? "en", null);
  setLocale(detected);
  for (const b of els.localeButtons) {
    b.setAttribute("aria-pressed", b.getAttribute("data-locale") === detected ? "true" : "false");
  }
  applyI18n();
  updateCancelVisibility();
  send({ type: "initDone" });
}

init();
