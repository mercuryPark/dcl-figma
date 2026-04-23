// Full → Slim first-pass transformation.
// Slim keeps: meta + tokens + per-screen summaries (textSummary, sectionTree) + components.
// `textSummary` collects the top N non-empty text characters from the screen subtree.
// `sectionTree` is an indent-based string tree capped at depth D.

import type { AnyNode, DesignFull, DesignSlim, ScreenSummary, Page } from "../schema";

export interface SlimOptions {
  textSummaryLimit: number;   // default 20
  sectionDepthLimit: number;  // default 3
  includeTokens: boolean;     // default true
}

export const DEFAULT_SLIM_OPTIONS: SlimOptions = {
  textSummaryLimit: 20,
  sectionDepthLimit: 3,
  includeTokens: true
};

function collectTextCharacters(node: AnyNode, out: string[], limit: number): void {
  if (out.length >= limit) return;
  if (node.type === "TEXT") {
    const t = (node as { characters?: string }).characters;
    if (t && t.trim().length > 0) out.push(t);
    return;
  }
  const children = (node as { children?: AnyNode[] }).children;
  if (!children) return;
  for (const c of children) {
    if (out.length >= limit) break;
    collectTextCharacters(c, out, limit);
  }
}

function renderSectionTree(nodes: readonly AnyNode[], depth: number, maxDepth: number): string[] {
  if (depth >= maxDepth) return [];
  const lines: string[] = [];
  for (const n of nodes) {
    const name = n.name ? n.name : `(${n.type})`;
    lines.push(`${"  ".repeat(depth)}${n.type}: ${name}`);
    const children = (n as { children?: AnyNode[] }).children;
    if (children && children.length) {
      lines.push(...renderSectionTree(children, depth + 1, maxDepth));
    }
  }
  return lines;
}

function pickScreens(pages: readonly Page[]): Array<{ page: Page; screen: AnyNode }> {
  // A screen is a top-level FRAME or SECTION within a page. Fallback: treat any direct
  // child as a screen if no frames exist.
  const out: Array<{ page: Page; screen: AnyNode }> = [];
  for (const p of pages) {
    const topFrames = p.children.filter((c) => c.type === "FRAME" || c.type === "SECTION" || c.type === "COMPONENT");
    const screens = topFrames.length ? topFrames : p.children;
    for (const s of screens) out.push({ page: p, screen: s });
  }
  return out;
}

export function toSlim(full: DesignFull, opts: SlimOptions = DEFAULT_SLIM_OPTIONS): DesignSlim {
  const screens: ScreenSummary[] = [];
  for (const { screen } of pickScreens(full.pages)) {
    const textSummary: string[] = [];
    collectTextCharacters(screen, textSummary, opts.textSummaryLimit);
    const treeLines = renderSectionTree([screen], 0, opts.sectionDepthLimit);
    const summary: ScreenSummary = {
      id: screen.id,
      name: screen.name,
      textSummary,
      sectionTree: treeLines.join("\n")
    };
    const box = (screen as { box?: { x: number; y: number; w: number; h: number } }).box;
    if (box) summary.box = box;
    screens.push(summary);
  }

  const slim: DesignSlim = {
    $schema: full.$schema,
    schemaVersion: full.schemaVersion,
    _howToUse: full._howToUse,
    meta: { ...full.meta, degraded: [] },
    screens,
    components: full.components
  };
  if (opts.includeTokens) slim.tokens = full.tokens;
  return slim;
}
