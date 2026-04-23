// Sandbox entry. Runs inside Figma's `code.js` worker — no DOM, no fetch.
// Orchestrates: extract → tokens → svg → build Full/Slim → chunked transport to UI.

import { extractRoots } from "./extract";
import { extractComponentEntry } from "./extract/component";
import { buildFilename } from "./filename";
import { buildEnvelopeHeader, buildMeta } from "./meta";
import type { AnyNode, ComponentEntry, DesignFull, Meta, Page, Tokens, VariableEntry } from "./schema";
import { buildSlim } from "./slim";
import { runSvgExport } from "./svg";
import { collectStyles } from "./tokens/styles";
import { collectVariables } from "./tokens/variables";
import { sendJsonInChunks, type TransportMessage } from "./transport/chunk";
import { byteLength } from "./util/size";

type Phase =
  | "idle"
  | "loadingPages"
  | "traversing"
  | "collectingStyles"
  | "collectingVariables"
  | "exportingSvg"
  | "buildingSlim"
  | "sending"
  | "done";

type Scope = "selection" | "currentPage" | "allPages";

interface DumpRequest {
  type: "dump";
  scope: Scope;
  includeHidden: boolean;
  includeTokens: boolean;
  includeSvg: boolean;
  requestId: string;
}

interface CancelMsg {
  type: "cancel";
}

interface InitDoneMsg {
  type: "initDone";
}

type UiInbound = DumpRequest | CancelMsg | InitDoneMsg;

function post(msg: Record<string, unknown> | TransportMessage): void {
  figma.ui.postMessage(msg);
}

function emitPhase(phase: Phase, extra?: Record<string, unknown>): void {
  post({ type: "phase", phase, ...(extra ?? {}) });
}

function emitError(code: "generic" | "transport" | "manifest" | "emptyScope", detail?: string): void {
  post({ type: "error", code, detail });
}

// --- roots resolution -------------------------------------------------------

async function resolveRoots(scope: Scope): Promise<{ roots: readonly SceneNode[]; pages: Array<{ id: string; name: string; roots: readonly SceneNode[] }>; pageIdFocus: string; pageNameFocus: string }> {
  if (scope === "selection") {
    const sel = figma.currentPage.selection;
    if (!sel.length) {
      return { roots: [], pages: [{ id: figma.currentPage.id, name: figma.currentPage.name, roots: [] }], pageIdFocus: figma.currentPage.id, pageNameFocus: figma.currentPage.name };
    }
    return {
      roots: sel,
      pages: [{ id: figma.currentPage.id, name: figma.currentPage.name, roots: sel }],
      pageIdFocus: figma.currentPage.id,
      pageNameFocus: figma.currentPage.name
    };
  }
  if (scope === "currentPage") {
    await figma.currentPage.loadAsync();
    const children = figma.currentPage.children;
    return {
      roots: children,
      pages: [{ id: figma.currentPage.id, name: figma.currentPage.name, roots: children }],
      pageIdFocus: figma.currentPage.id,
      pageNameFocus: figma.currentPage.name
    };
  }
  // allPages
  await figma.loadAllPagesAsync();
  const pages = figma.root.children as readonly PageNode[];
  const out: Array<{ id: string; name: string; roots: readonly SceneNode[] }> = [];
  let allRoots: SceneNode[] = [];
  for (const p of pages) {
    out.push({ id: p.id, name: p.name, roots: p.children });
    allRoots = allRoots.concat(p.children);
  }
  return {
    roots: allRoots,
    pages: out,
    pageIdFocus: figma.currentPage.id,
    pageNameFocus: "(all pages)"
  };
}

async function collectAllComponents(): Promise<ComponentEntry[]> {
  const out: ComponentEntry[] = [];
  const seen = new Set<string>();
  const pages = figma.root.children as readonly PageNode[];

  function visit(node: SceneNode): void {
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        out.push(extractComponentEntry(node as ComponentNode | ComponentSetNode));
      }
      // ComponentSet still has child Components — descend so variants are captured.
    }
    const children = (node as unknown as { children?: readonly SceneNode[] }).children;
    if (children && children.length) {
      for (const c of children) visit(c);
    }
  }

  for (const p of pages) {
    try {
      await p.loadAsync();
    } catch (err) {
      console.warn("[collectAllComponents] loadAsync failed for", p.id, err);
      continue;
    }
    for (const c of p.children) visit(c);
  }
  return out;
}

// --- dump -------------------------------------------------------------------

let cancelled = false;

async function handleDump(req: DumpRequest): Promise<void> {
  cancelled = false;

  try {
    emitPhase("loadingPages");
    const { roots, pages: pageBuckets, pageIdFocus, pageNameFocus } = await resolveRoots(req.scope);
    if (!roots.length) {
      emitError("emptyScope");
      emitPhase("idle");
      return;
    }

    emitPhase("traversing");
    const pagesOut: Page[] = [];
    const svgCandidates: Array<{ node: SceneNode; out: AnyNode }> = [];
    let totalProcessed = 0;

    for (const bucket of pageBuckets) {
      if (cancelled) return;
      const { nodes, vectors, processed } = await extractRoots(bucket.roots, {
        includeHidden: req.includeHidden,
        onProgress: (n) => post({ type: "progress", processed: totalProcessed + n }),
        shouldCancel: () => cancelled
      });
      pagesOut.push({ id: bucket.id, name: bucket.name, children: nodes });
      svgCandidates.push(...vectors);
      totalProcessed += processed;
    }

    if (cancelled) return;

    let tokens: Tokens = { colors: [], typography: [], effects: [], variables: [] };
    let variablesError = false;
    if (req.includeTokens) {
      emitPhase("collectingStyles");
      const styles = await collectStyles();
      emitPhase("collectingVariables");
      const vars = await collectVariables();
      variablesError = vars.error;
      tokens = {
        colors: styles.colors,
        typography: styles.typography,
        effects: styles.effects,
        variables: vars.entries as VariableEntry[]
      };
    }

    emitPhase("exportingSvg");
    const svgResult = await runSvgExport(svgCandidates, { enabled: req.includeSvg });

    const meta: Meta = buildMeta({
      fileKey: null, // Plugin API does not expose fileKey directly.
      fileName: figma.root.name,
      pageId: pageIdFocus,
      pageName: pageNameFocus,
      stats: {
        totalNodes: totalProcessed,
        svgExported: svgResult.exported,
        svgFailed: svgResult.failed,
        variablesError
      }
    });

    const components = await collectAllComponents();

    const full: DesignFull = {
      ...buildEnvelopeHeader(),
      meta,
      tokens,
      pages: pagesOut,
      components
    };

    emitPhase("buildingSlim");
    const slimResult = buildSlim(full);

    const fullJson = JSON.stringify(full);
    const fullBytes = byteLength(fullJson);

    const fileName = figma.root.name;
    const pageName = req.scope === "allPages" ? null : figma.currentPage.name;
    const slimFilename = buildFilename({ fileName, pageName, kind: "slim" });
    const fullFilename = buildFilename({ fileName, pageName, kind: "full" });

    post({
      type: "dumpReady",
      requestId: req.requestId,
      slimFilename,
      fullFilename,
      slimBytes: slimResult.bytes,
      fullBytes,
      warnings: {
        variablesError,
        svgFailed: svgResult.failed,
        degraded: slimResult.degraded
      }
    });

    emitPhase("sending");
    const slimSender = { postMessage: (m: TransportMessage) => post(m) };
    await sendJsonInChunks(slimSender, "slim", slimResult.json);
    await sendJsonInChunks(slimSender, "full", fullJson);

    emitPhase("done");
  } catch (err) {
    console.error("[code] dump failed", err);
    emitError("generic", err instanceof Error ? err.message : String(err));
    emitPhase("idle");
  }
}

// --- entry ------------------------------------------------------------------

figma.showUI(__html__, { width: 440, height: 540, themeColors: true });

figma.ui.onmessage = (msg: UiInbound) => {
  if (!msg || typeof msg !== "object") return;
  switch (msg.type) {
    case "initDone":
      post({
        type: "context",
        fileName: figma.root.name,
        pageName: figma.currentPage.name,
        pageId: figma.currentPage.id,
        selectionCount: figma.currentPage.selection.length
      });
      return;
    case "dump":
      handleDump(msg);
      return;
    case "cancel":
      cancelled = true;
      return;
  }
};

// Selection updates so the UI can keep its "Selection (N)" label fresh.
figma.on("selectionchange", () => {
  post({
    type: "selection",
    selectionCount: figma.currentPage.selection.length
  });
});
