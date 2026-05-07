// Instance node extraction — preserve mainComponentId without recursing into Component definition.
// Under `documentAccess: "dynamic-page"` the sync `.mainComponent` accessor throws, so we must
// use `getMainComponentAsync()`. That makes this extractor async.

import type { InstanceNode as InstanceOut } from "../schema";
import { commonFields, computeRenderBox, nodeBox, normalizeEffects, normalizePaints } from "./common";

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
    effects?: unknown;
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

  // Each override entry says which fields differ from the main component for a child node id.
  // We do NOT call figma.getNodeByIdAsync per override — that previously caused N async lookups
  // per instance, accumulating heavy latency on instance-rich pages. The override target's
  // current field values, name, and type are all already present in this instance's `children`
  // subtree (the walker extracted them). Consumers resolve `overrides[id]` by locating the
  // matching id within `children`. The optional `nodeType` field on InstanceOverride is
  // reserved for a future post-walk enrichment pass.
  if (any.overrides && any.overrides.length) {
    const o: Record<string, { fields: string[]; nodeType?: string }> = {};
    for (const entry of any.overrides) {
      o[entry.id] = { fields: [...entry.overriddenFields] };
    }
    out.overrides = o;
  }

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;
  const renderBox = computeRenderBox(box, normalizeEffects(any.effects));
  if (renderBox) out.renderBox = renderBox;

  return out;
}
