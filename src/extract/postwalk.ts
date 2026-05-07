import type { AnyNode, InstanceNode as InstanceOut } from "../schema";

function buildIdTypeMap(root: AnyNode): Map<string, string> {
  const map = new Map<string, string>();
  const stack: AnyNode[] = [root];

  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;

    map.set(node.id, node.type);
    const children = (node as { children?: AnyNode[] }).children;
    if (children) {
      for (const child of children) stack.push(child);
    }
  }

  return map;
}

export function enrichInstanceOverrides(node: AnyNode): void {
  if (node.type === "INSTANCE") {
    const inst = node as InstanceOut;
    if (inst.overrides && inst.children) {
      const idTypeMap = new Map<string, string>();
      for (const child of inst.children) {
        const childMap = buildIdTypeMap(child);
        for (const [id, type] of childMap) idTypeMap.set(id, type);
      }

      for (const [id, override] of Object.entries(inst.overrides)) {
        if (!override.nodeType) {
          const type = idTypeMap.get(id);
          if (type) override.nodeType = type;
        }
      }
    }
  }

  const children = (node as { children?: AnyNode[] }).children;
  if (children) {
    for (const child of children) enrichInstanceOverrides(child);
  }
}
