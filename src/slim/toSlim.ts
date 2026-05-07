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

// Inline layout cues so the section tree alone tells the LLM how children are arranged
// (Slim drops the per-frame layout fields, this is the only place that signal survives).
function justifyOf(v: string | undefined): string | null {
  if (!v || v === "MIN") return null;
  if (v === "CENTER") return "center";
  if (v === "MAX") return "end";
  if (v === "SPACE_BETWEEN") return "space-between";
  return null;
}

function alignOf(v: string | undefined): string | null {
  if (!v || v === "MIN") return null;
  if (v === "CENTER") return "center";
  if (v === "MAX") return "end";
  if (v === "BASELINE") return "baseline";
  return null;
}

function layoutHint(n: AnyNode): string {
  if (n.type !== "FRAME" && n.type !== "GROUP" && n.type !== "SECTION" &&
      n.type !== "COMPONENT" && n.type !== "COMPONENT_SET") return "";
  const f = n as {
    layoutMode?: string; layoutWrap?: string;
    primaryAxisAlignItems?: string; counterAxisAlignItems?: string;
    itemSpacing?: number; counterAxisSpacing?: number;
    paddingTop?: number; paddingRight?: number; paddingBottom?: number; paddingLeft?: number;
  };
  const parts: string[] = [];
  if (f.layoutMode === "HORIZONTAL") parts.push("hstack");
  else if (f.layoutMode === "VERTICAL") parts.push("vstack");
  if (f.layoutWrap === "WRAP") parts.push("wrap");
  const justify = justifyOf(f.primaryAxisAlignItems);
  if (justify) parts.push(`justify=${justify}`);
  const align = alignOf(f.counterAxisAlignItems);
  if (align) parts.push(`align=${align}`);
  if (typeof f.itemSpacing === "number") parts.push(`gap=${f.itemSpacing}`);
  if (typeof f.counterAxisSpacing === "number") parts.push(`gapY=${f.counterAxisSpacing}`);
  const hasPad = [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft].some((v) => typeof v === "number");
  if (hasPad) {
    const t = f.paddingTop ?? 0, r = f.paddingRight ?? 0, b = f.paddingBottom ?? 0, l = f.paddingLeft ?? 0;
    if (t === r && r === b && b === l) {
      if (t !== 0) parts.push(`p=${t}`);
    } else if (t === b && l === r) {
      parts.push(`p=${t} ${l}`);
    } else {
      parts.push(`p=${t} ${r} ${b} ${l}`);
    }
  }
  return parts.length ? ` [${parts.join(", ")}]` : "";
}

function renderSectionTree(nodes: readonly AnyNode[], depth: number, maxDepth: number): string[] {
  if (depth >= maxDepth) return [];
  const lines: string[] = [];
  for (const n of nodes) {
    const name = n.name ? n.name : `(${n.type})`;
    lines.push(`${"  ".repeat(depth)}${n.type}: ${name}${layoutHint(n)}`);
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
