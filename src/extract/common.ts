// Helpers shared across extractors: paint/effect normalization, box math.

import type { Paint, Effect, Box, StrokeAlign, StrokeCap, StrokeJoin, IndividualStrokes } from "../schema";
import { round2 } from "../util/prune";

const IDENTITY_TRANSFORM = [[1, 0, 0], [0, 1, 0]];

type PaintFigma = {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number };
  gradientStops?: ReadonlyArray<{ position: number; color: { r: number; g: number; b: number; a: number } }>;
  gradientTransform?: ReadonlyArray<ReadonlyArray<number>>;
  imageHash?: string | null;
  scaleMode?: string;
};

type EffectFigma = {
  type: string;
  visible?: boolean;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
};

function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, "0");
  const base = `#${h(r)}${h(g)}${h(b)}`;
  if (a === undefined || a >= 1) return base;
  return `${base}${h(a)}`;
}

function normalizeTransform2x3(raw: unknown): number[][] | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const transform: number[][] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length !== 3 || !row.every((v) => typeof v === "number" && Number.isFinite(v))) {
      return undefined;
    }
    transform.push(row.map((v) => {
      const rounded = round2(v);
      return Object.is(rounded, -0) ? 0 : rounded;
    }));
  }
  const isIdentity = transform.every((row, rowIndex) => row.every((value, colIndex) => value === IDENTITY_TRANSFORM[rowIndex]?.[colIndex]));
  return isIdentity ? undefined : transform;
}

function isStrokeAlign(value: unknown): value is StrokeAlign {
  return value === "INSIDE" || value === "OUTSIDE" || value === "CENTER";
}

function isStrokeCap(value: unknown): value is StrokeCap {
  return value === "NONE" || value === "ROUND" || value === "SQUARE" || value === "ARROW_LINES" || value === "ARROW_EQUILATERAL";
}

function isStrokeJoin(value: unknown): value is StrokeJoin {
  return value === "MITER" || value === "BEVEL" || value === "ROUND";
}

interface StrokeSource {
  strokeAlign?: unknown;
  strokeCap?: unknown;
  strokeJoin?: unknown;
  strokeDashes?: unknown;
  dashPattern?: unknown;
  strokeMiterLimit?: unknown;
}

export interface StrokeFields {
  strokeAlign?: StrokeAlign;
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  strokeDashes?: number[];
  strokeMiterLimit?: number;
}

export function extractStrokeFields(raw: StrokeSource): StrokeFields {
  const out: StrokeFields = {};
  if (isStrokeAlign(raw.strokeAlign) && raw.strokeAlign !== "INSIDE") out.strokeAlign = raw.strokeAlign;
  if (isStrokeCap(raw.strokeCap) && raw.strokeCap !== "NONE") out.strokeCap = raw.strokeCap;
  if (isStrokeJoin(raw.strokeJoin) && raw.strokeJoin !== "MITER") out.strokeJoin = raw.strokeJoin;

  const dashes = raw.dashPattern ?? raw.strokeDashes;
  if (Array.isArray(dashes) && dashes.length > 0 && dashes.every((v) => typeof v === "number" && Number.isFinite(v))) {
    out.strokeDashes = dashes.map((v) => round2(v));
  }

  if (typeof raw.strokeMiterLimit === "number" && Number.isFinite(raw.strokeMiterLimit)) {
    const strokeMiterLimit = round2(raw.strokeMiterLimit);
    if (strokeMiterLimit !== 4) out.strokeMiterLimit = strokeMiterLimit;
  }
  return out;
}

export function extractIndividualStrokes(raw: {
  strokeTopWeight?: unknown;
  strokeRightWeight?: unknown;
  strokeBottomWeight?: unknown;
  strokeLeftWeight?: unknown;
}): IndividualStrokes | undefined {
  if (
    typeof raw.strokeTopWeight !== "number" || !Number.isFinite(raw.strokeTopWeight) ||
    typeof raw.strokeRightWeight !== "number" || !Number.isFinite(raw.strokeRightWeight) ||
    typeof raw.strokeBottomWeight !== "number" || !Number.isFinite(raw.strokeBottomWeight) ||
    typeof raw.strokeLeftWeight !== "number" || !Number.isFinite(raw.strokeLeftWeight)
  ) {
    return undefined;
  }
  const top = round2(raw.strokeTopWeight);
  const right = round2(raw.strokeRightWeight);
  const bottom = round2(raw.strokeBottomWeight);
  const left = round2(raw.strokeLeftWeight);
  if (top === right && right === bottom && bottom === left) return undefined;
  return { top, right, bottom, left };
}

export function normalizePaints(raw: unknown): Paint[] | undefined {
  if (!raw) return undefined;
  // figma.mixed is a symbol; detect structurally to keep typecheck simple.
  if (typeof raw === "symbol") return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out: Paint[] = [];
  for (const p of raw) {
    const fig = p as PaintFigma;
    if (!fig || fig.visible === false) continue;
    if (fig.type === "SOLID" && fig.color) {
      out.push({
        type: "SOLID",
        color: rgbaToHex(fig.color.r, fig.color.g, fig.color.b, fig.opacity)
      });
    } else if (
      fig.type === "GRADIENT_LINEAR" ||
      fig.type === "GRADIENT_RADIAL" ||
      fig.type === "GRADIENT_ANGULAR" ||
      fig.type === "GRADIENT_DIAMOND"
    ) {
      const stops = (fig.gradientStops ?? []).map((s) => ({
        position: round2(s.position),
        color: rgbaToHex(s.color.r, s.color.g, s.color.b, s.color.a)
      }));
      const entry: Paint = { type: fig.type, stops };
      const gradientTransform = normalizeTransform2x3(fig.gradientTransform);
      if (gradientTransform) entry.gradientTransform = gradientTransform;
      out.push(entry);
    } else if (fig.type === "IMAGE") {
      const entry: Paint = {
        type: "IMAGE",
        imageHash: fig.imageHash ?? ""
      };
      if (fig.scaleMode) entry.scaleMode = fig.scaleMode;
      out.push(entry);
    }
  }
  return out.length ? out : undefined;
}

export function normalizeEffects(raw: unknown): Effect[] | undefined {
  if (!raw || !Array.isArray(raw)) return undefined;
  const out: Effect[] = [];
  for (const e of raw) {
    const fig = e as EffectFigma;
    if (!fig || fig.visible === false) continue;
    const entry: Effect = { type: fig.type };
    if (fig.color) entry.color = rgbaToHex(fig.color.r, fig.color.g, fig.color.b, fig.color.a);
    if (fig.offset) entry.offset = { x: round2(fig.offset.x), y: round2(fig.offset.y) };
    if (typeof fig.radius === "number") entry.radius = round2(fig.radius);
    if (typeof fig.spread === "number") entry.spread = round2(fig.spread);
    out.push(entry);
  }
  return out.length ? out : undefined;
}

export function nodeBox(n: { x?: number; y?: number; width?: number; height?: number }): Box | undefined {
  if (typeof n.x !== "number" || typeof n.y !== "number" || typeof n.width !== "number" || typeof n.height !== "number") {
    return undefined;
  }
  return { x: round2(n.x), y: round2(n.y), w: round2(n.width), h: round2(n.height) };
}

interface CommonOut {
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  blendMode?: string;
  locked?: boolean;
  constraints?: { horizontal: string; vertical: string };
  layoutPositioning?: string;
}

export function commonFields(n: SceneNode): CommonOut {
  const out: CommonOut = {};
  if (n.visible === false) out.visible = false;
  const any = n as unknown as {
    opacity?: number;
    rotation?: number;
    blendMode?: string;
    constraints?: { horizontal?: unknown; vertical?: unknown };
    layoutPositioning?: string;
  };
  if (typeof any.opacity === "number" && any.opacity !== 1) out.opacity = round2(any.opacity);
  if (typeof any.rotation === "number" && any.rotation !== 0) out.rotation = round2(any.rotation);
  if (typeof any.blendMode === "string" && any.blendMode !== "NORMAL" && any.blendMode !== "PASS_THROUGH") {
    out.blendMode = any.blendMode;
  }
  if (n.locked === true) out.locked = true;
  // Constraints default to MIN/MIN; emit only when non-default to keep the dump compact.
  if (
    any.constraints &&
    typeof any.constraints.horizontal === "string" &&
    typeof any.constraints.vertical === "string" &&
    !(any.constraints.horizontal === "MIN" && any.constraints.vertical === "MIN")
  ) {
    out.constraints = {
      horizontal: any.constraints.horizontal,
      vertical: any.constraints.vertical
    };
  }
  // layoutPositioning is "AUTO" by default; we only care about ABSOLUTE (escape from parent's auto-layout).
  if (typeof any.layoutPositioning === "string" && any.layoutPositioning !== "AUTO") {
    out.layoutPositioning = any.layoutPositioning;
  }
  return out;
}
