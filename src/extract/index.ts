// Extraction dispatcher. Given a set of root SceneNodes, produces:
//   - a tree of AnyNode objects mirroring Figma's z-order (no sort).
//   - a flat list of (node, produced) tuples for downstream stages (SVG export, slim summary).
//
// The dispatcher uses traverseAsync for yielding, but builds its own recursive output tree
// so that `children` arrays can be populated in-order without a second pass.

import type { AnyNode, FrameLikeNode } from "../schema";
import { extractFrameLike } from "./frame";
import { extractText } from "./text";
import { extractInstance } from "./instance";
import { extractVector, isVectorFamily } from "./vector";

export interface ExtractOptions {
  includeHidden: boolean;
  onProgress?: (processed: number) => void;
  shouldCancel?: () => boolean;
}

interface ExtractState {
  processed: number;
  cancelled: boolean;
  opts: ExtractOptions;
  vectorCandidates: Array<{ node: SceneNode; out: AnyNode }>;
}

const YIELD = () => new Promise<void>((r) => setTimeout(r, 0));

function shouldSkip(node: SceneNode, opts: ExtractOptions): boolean {
  if (!opts.includeHidden && node.visible === false) return true;
  return false;
}

async function walk(node: SceneNode, state: ExtractState): Promise<AnyNode | null> {
  if (state.cancelled) return null;
  if (state.opts.shouldCancel?.()) { state.cancelled = true; return null; }
  if (shouldSkip(node, state.opts)) return null;

  let out: AnyNode | null = null;

  if (node.type === "FRAME" || node.type === "GROUP" || node.type === "SECTION" ||
      node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    const frame = extractFrameLike(node) as FrameLikeNode;
    const children = (node as unknown as { children?: readonly SceneNode[] }).children;
    if (children && children.length) {
      const kids: AnyNode[] = [];
      for (const c of children) {
        if (state.cancelled) break;
        const childOut = await walk(c, state);
        if (childOut) kids.push(childOut);
      }
      if (kids.length) frame.children = kids;
    }
    out = frame;
  } else if (node.type === "TEXT") {
    out = extractText(node as TextNode);
  } else if (node.type === "INSTANCE") {
    const inst = await extractInstance(node as InstanceNode);
    const children = (node as unknown as { children?: readonly SceneNode[] }).children;
    if (children && children.length) {
      const kids: AnyNode[] = [];
      for (const c of children) {
        if (state.cancelled) break;
        const childOut = await walk(c, state);
        if (childOut) kids.push(childOut);
      }
      if (kids.length) inst.children = kids;
    }
    out = inst;
  } else if (isVectorFamily(node.type)) {
    const v = extractVector(node as Parameters<typeof extractVector>[0]);
    out = v;
    state.vectorCandidates.push({ node, out });
  }

  if (out) {
    state.processed++;
    state.opts.onProgress?.(state.processed);
    if (state.processed % 50 === 0) await YIELD();
  }
  return out;
}

export async function extractRoots(
  roots: readonly SceneNode[],
  opts: ExtractOptions
): Promise<{ nodes: AnyNode[]; vectors: Array<{ node: SceneNode; out: AnyNode }>; processed: number }> {
  const state: ExtractState = {
    processed: 0,
    cancelled: false,
    opts,
    vectorCandidates: []
  };
  const out: AnyNode[] = [];
  for (const r of roots) {
    if (state.cancelled) break;
    const n = await walk(r, state);
    if (n) out.push(n);
  }
  return { nodes: out, vectors: state.vectorCandidates, processed: state.processed };
}
