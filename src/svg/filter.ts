// SVG export candidate filter.
// A node is a candidate iff:
//   - its name matches `icon/*` (simple glob, case-insensitive), OR
//   - it is a VECTOR-family node with width ≤ 64 AND height ≤ 64.

const ICON_GLOB_PREFIX = "icon/";
const MAX_DIM = 64;

export function matchesIconName(name: string | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().startsWith(ICON_GLOB_PREFIX);
}

const VECTOR_TYPES = new Set([
  "LINE", "RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "BOOLEAN_OPERATION", "VECTOR"
]);

export function isSvgCandidate(node: SceneNode): boolean {
  if (matchesIconName(node.name)) return true;
  if (!VECTOR_TYPES.has(node.type)) return false;
  const w = (node as unknown as { width?: number }).width ?? 0;
  const h = (node as unknown as { height?: number }).height ?? 0;
  return w > 0 && h > 0 && w <= MAX_DIM && h <= MAX_DIM;
}
