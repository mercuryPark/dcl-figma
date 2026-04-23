// Image-fill hash surfacing. Images are never embedded as binaries — only the Figma
// image hash is kept, which is enough for the LLM to understand "this slot is an image".
//
// Most of the work is already done inside `normalizePaints`; this module provides a
// predicate consumers can use to tell "does this node have an image fill?".

import type { AnyNode } from "../schema";

export function hasImageFill(node: AnyNode): boolean {
  const fills = (node as { fills?: unknown }).fills;
  if (!Array.isArray(fills)) return false;
  return fills.some((p) => (p as { type?: string }).type === "IMAGE");
}

export function imageHashes(node: AnyNode): string[] {
  const fills = (node as { fills?: unknown }).fills;
  if (!Array.isArray(fills)) return [];
  const hashes: string[] = [];
  for (const p of fills) {
    const pp = p as { type?: string; imageHash?: string };
    if (pp.type === "IMAGE" && pp.imageHash) hashes.push(pp.imageHash);
  }
  return hashes;
}
