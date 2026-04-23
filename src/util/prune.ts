// Pruning rules applied to every emitted node object.
// - Round numeric coordinates/dimensions to 2 decimals.
// - Drop Figma API default-equivalent fields.
// - Drop null/undefined/empty collections.

const DEFAULTS: Record<string, unknown> = {
  visible: true,
  opacity: 1,
  rotation: 0,
  blendMode: "NORMAL",
  locked: false
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundBox(b: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  return { x: round2(b.x), y: round2(b.y), w: round2(b.w), h: round2(b.h) };
}

function isEmptyContainer(v: unknown): boolean {
  if (Array.isArray(v)) return v.length === 0;
  if (v !== null && typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

export function prune<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (isEmptyContainer(v)) continue;
    if (k in DEFAULTS && v === DEFAULTS[k]) continue;
    out[k] = v;
  }
  return out as T;
}
