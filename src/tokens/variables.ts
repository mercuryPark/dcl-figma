// Variables collection. Each Variable × mode pair becomes one entry.
// If the Variables API throws or is unavailable, callers receive:
//   { entries: [], error: true }
// and are responsible for recording that in `meta.stats.variablesError`.

import type { VariableEntry } from "../schema";
import { round2 } from "../util/prune";

export interface VariableCollectionResult {
  entries: VariableEntry[];
  error: boolean;
}

function rgbaToHex(r: number, g: number, b: number, a?: number): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, "0");
  const base = `#${h(r)}${h(g)}${h(b)}`;
  if (a === undefined || a >= 1) return base;
  return `${base}${h(a)}`;
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return round2(value);
  if (typeof value === "object") {
    const obj = value as { r?: number; g?: number; b?: number; a?: number; type?: string; id?: string };
    if (typeof obj.r === "number" && typeof obj.g === "number" && typeof obj.b === "number") {
      return rgbaToHex(obj.r, obj.g, obj.b, obj.a);
    }
    if (obj.type === "VARIABLE_ALIAS" && typeof obj.id === "string") {
      return { alias: obj.id };
    }
  }
  return String(value);
}

export async function collectVariables(): Promise<VariableCollectionResult> {
  try {
    const anyFigma = figma as unknown as {
      variables?: {
        getLocalVariablesAsync: () => Promise<ReadonlyArray<{
          id: string; name: string; resolvedType: string; variableCollectionId: string;
          valuesByMode: Record<string, unknown>;
        }>>;
        getVariableCollectionByIdAsync: (id: string) => Promise<{
          id: string; name: string; modes: ReadonlyArray<{ modeId: string; name: string }>;
        } | null>;
      };
    };

    if (!anyFigma.variables?.getLocalVariablesAsync) {
      return { entries: [], error: true };
    }

    const vars = await anyFigma.variables.getLocalVariablesAsync();
    const collectionCache = new Map<string, { name: string; modes: Map<string, string> }>();

    const entries: VariableEntry[] = [];
    for (const v of vars) {
      let collection = collectionCache.get(v.variableCollectionId);
      if (!collection) {
        const c = await anyFigma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
        if (c) {
          const modes = new Map<string, string>();
          for (const m of c.modes) modes.set(m.modeId, m.name);
          collection = { name: c.name, modes };
          collectionCache.set(v.variableCollectionId, collection);
        } else {
          collection = { name: "", modes: new Map() };
        }
      }
      for (const [modeId, raw] of Object.entries(v.valuesByMode)) {
        entries.push({
          id: v.id,
          name: v.name,
          collectionName: collection.name,
          resolvedType: v.resolvedType,
          value: serializeValue(raw),
          modeId,
          modeName: collection.modes.get(modeId) ?? modeId
        });
      }
    }

    return { entries, error: false };
  } catch (err) {
    console.warn("[tokens/variables] Variables API failed:", err);
    return { entries: [], error: true };
  }
}
