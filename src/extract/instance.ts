// Instance node extraction — preserve mainComponentId without recursing into Component definition.
// Under `documentAccess: "dynamic-page"` the sync `.mainComponent` accessor throws, so we must
// use `getMainComponentAsync()`. That makes this extractor async.

import type { InstanceNode as InstanceOut } from "../schema";
import { commonFields, nodeBox, normalizePaints } from "./common";

export async function extractInstance(n: InstanceNode): Promise<InstanceOut> {
  const out: InstanceOut = {
    id: n.id,
    type: "INSTANCE",
    name: n.name,
    mainComponentId: null,
    ...commonFields(n)
  };
  const box = nodeBox(n);
  if (box) out.box = box;

  const any = n as unknown as {
    getMainComponentAsync?: () => Promise<{ id?: string; name?: string } | null>;
    overrides?: ReadonlyArray<{ id: string; overriddenFields: readonly string[] }>;
    fills?: unknown;
  };

  if (typeof any.getMainComponentAsync === "function") {
    try {
      const main = await any.getMainComponentAsync();
      if (main && main.id) {
        out.mainComponentId = main.id;
        if (main.name) out.mainComponentName = main.name;
      }
    } catch (err) {
      console.warn("[extract/instance] getMainComponentAsync failed:", err);
    }
  }

  if (any.overrides && any.overrides.length) {
    const o: Record<string, string[]> = {};
    for (const entry of any.overrides) {
      o[entry.id] = [...entry.overriddenFields];
    }
    out.overrides = o;
  }

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;

  return out;
}
