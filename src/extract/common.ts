// Helpers shared across extractors: paint/effect normalization, box math.

import type { Paint, Effect, Box } from "../schema";
import { round2 } from "../util/prune";

type PaintFigma = {
  type: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number };
  gradientStops?: ReadonlyArray<{ position: number; color: { r: number; g: number; b: number; a: number } }>;
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
      out.push({ type: fig.type, stops });
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

export function commonFields(n: SceneNode): {
  visible?: boolean; opacity?: number; rotation?: number; blendMode?: string; locked?: boolean;
} {
  const out: { visible?: boolean; opacity?: number; rotation?: number; blendMode?: string; locked?: boolean } = {};
  if (n.visible === false) out.visible = false;
  const any = n as unknown as { opacity?: number; rotation?: number; blendMode?: string };
  if (typeof any.opacity === "number" && any.opacity !== 1) out.opacity = round2(any.opacity);
  if (typeof any.rotation === "number" && any.rotation !== 0) out.rotation = round2(any.rotation);
  if (typeof any.blendMode === "string" && any.blendMode !== "NORMAL" && any.blendMode !== "PASS_THROUGH") {
    out.blendMode = any.blendMode;
  }
  if (n.locked === true) out.locked = true;
  return out;
}
