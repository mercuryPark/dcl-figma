import test from "node:test";
import assert from "node:assert/strict";
import type { AnyNode, FrameLikeNode, InstanceNode as InstanceOut, TextNode } from "../schema";
import { enrichInstanceOverrides } from "./postwalk";

function text(id: string): TextNode {
  return {
    id,
    type: "TEXT",
    name: "Text",
    characters: "Hello",
    style: {}
  };
}

function frame(id: string, children: AnyNode[] = []): FrameLikeNode {
  return {
    id,
    type: "FRAME",
    name: "Frame",
    children
  };
}

function instance(overrides: InstanceOut["overrides"], children?: AnyNode[]): InstanceOut {
  const out: InstanceOut = {
    id: "instance-1",
    type: "INSTANCE",
    name: "Instance",
    mainComponentId: null,
    overrides
  };
  if (children) out.children = children;
  return out;
}

test("instance override nodeType is filled from a child text node", () => {
  const root = instance(
    { "text-1": { fields: ["characters"] } },
    [text("text-1")]
  );

  enrichInstanceOverrides(root);

  assert.equal(root.overrides?.["text-1"]?.nodeType, "TEXT");
});

test("instance override nodeType stays empty when child id is absent", () => {
  const root = instance(
    { external: { fields: ["characters"] } },
    [text("text-1")]
  );

  enrichInstanceOverrides(root);

  assert.equal(root.overrides?.external.nodeType, undefined);
});

test("instance override nodeType is filled from nested children", () => {
  const root = instance(
    { "text-2": { fields: ["characters"] } },
    [frame("frame-1", [text("text-2")])]
  );

  enrichInstanceOverrides(root);

  assert.equal(root.overrides?.["text-2"]?.nodeType, "TEXT");
});

test("instance override nodeType is not overwritten when already present", () => {
  const root = instance(
    { "text-1": { fields: ["characters"], nodeType: "RECTANGLE" } },
    [text("text-1")]
  );

  enrichInstanceOverrides(root);

  assert.equal(root.overrides?.["text-1"]?.nodeType, "RECTANGLE");
});
