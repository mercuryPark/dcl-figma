// Component / ComponentSet definitions — surface only the top-level metadata that LLMs need.
// Nested content of a Component is extracted via the same frame/text/vector pipeline;
// this module produces the `components[]` array at the dump envelope.

import type { ComponentEntry } from "../schema";
import { nodeBox } from "./common";

export function extractComponentEntry(n: ComponentNode | ComponentSetNode): ComponentEntry {
  const entry: ComponentEntry = {
    id: n.id,
    name: n.name
  };
  const desc = (n as unknown as { description?: string }).description;
  if (typeof desc === "string" && desc.length > 0) entry.description = desc;
  const box = nodeBox(n);
  if (box) entry.box = box;
  return entry;
}
