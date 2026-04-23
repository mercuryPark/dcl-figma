// Slim pipeline: first-pass → measure → degrade ladder → final.
// Returns the final DesignSlim along with the serialized payload (as JSON string) so callers
// can reuse the bytes for transport chunking without re-serializing.

import type { DesignFull, DesignSlim } from "../schema";
import { byteLength } from "../util/size";
import { DEGRADE_LADDER } from "./degrade";
import { DEFAULT_SLIM_OPTIONS, toSlim } from "./toSlim";

export const SLIM_BYTE_LIMIT = 500 * 1024;
export const EXCEEDED_MARKER = "exceededAfterFullDegrade";

export interface SlimResult {
  slim: DesignSlim;
  json: string;
  bytes: number;
  degraded: string[];
  exceeded: boolean;
}

export function buildSlim(full: DesignFull, byteLimit: number = SLIM_BYTE_LIMIT): SlimResult {
  let current = toSlim(full, DEFAULT_SLIM_OPTIONS);
  let json = JSON.stringify(current);
  let bytes = byteLength(json);
  const degraded: string[] = [];

  if (bytes <= byteLimit) {
    current.meta = { ...current.meta, degraded: [] };
    return { slim: current, json: JSON.stringify(current), bytes, degraded: [], exceeded: false };
  }

  for (const step of DEGRADE_LADDER) {
    current = step.apply(full);
    degraded.push(step.marker);
    current.meta = { ...current.meta, degraded: [...degraded] };
    json = JSON.stringify(current);
    bytes = byteLength(json);
    if (bytes <= byteLimit) {
      return { slim: current, json, bytes, degraded: [...degraded], exceeded: false };
    }
  }

  degraded.push(EXCEEDED_MARKER);
  current.meta = { ...current.meta, degraded: [...degraded] };
  json = JSON.stringify(current);
  bytes = byteLength(json);
  return { slim: current, json, bytes, degraded: [...degraded], exceeded: true };
}
