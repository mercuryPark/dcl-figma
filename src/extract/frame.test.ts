import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaints } from "./common";
import { extractFrameLike } from "./frame";
import { extractVector } from "./vector";

function mockFrame(overrides: Record<string, unknown> = {}): SceneNode {
  return {
    id: "frame-1",
    type: "FRAME",
    name: "Frame",
    visible: true,
    locked: false,
    ...overrides
  } as unknown as SceneNode;
}

function mockVector(overrides: Record<string, unknown> = {}): SceneNode & { type: "VECTOR" } {
  return {
    id: "vector-1",
    type: "VECTOR",
    name: "Vector",
    visible: true,
    locked: false,
    ...overrides
  } as unknown as SceneNode & { type: "VECTOR" };
}

test("strokeAlign OUTSIDE is preserved on frame-like nodes", () => {
  const out = extractFrameLike(mockFrame({ strokeAlign: "OUTSIDE" }));
  assert.equal(out.strokeAlign, "OUTSIDE");
});

test("strokeAlign INSIDE is omitted as the default", () => {
  const out = extractFrameLike(mockFrame({ strokeAlign: "INSIDE" }));
  assert.equal("strokeAlign" in out, false);
});

test("strokeDashes are preserved from Figma dashPattern", () => {
  const out = extractVector(mockVector({ dashPattern: [4, 2] }));
  assert.deepEqual(out.strokeDashes, [4, 2]);
});

test("stroke cap, join, and miter limit keep non-default values only", () => {
  const kept = extractVector(mockVector({
    strokeCap: "ROUND",
    strokeJoin: "BEVEL",
    strokeMiterLimit: 6.125
  }));
  assert.equal(kept.strokeCap, "ROUND");
  assert.equal(kept.strokeJoin, "BEVEL");
  assert.equal(kept.strokeMiterLimit, 6.13);

  const pruned = extractVector(mockVector({
    strokeCap: "NONE",
    strokeJoin: "MITER",
    strokeMiterLimit: 4
  }));
  assert.equal("strokeCap" in pruned, false);
  assert.equal("strokeJoin" in pruned, false);
  assert.equal("strokeMiterLimit" in pruned, false);
});

test("individualStrokes are preserved for asymmetric frame stroke weights", () => {
  const out = extractFrameLike(mockFrame({
    strokeTopWeight: 1,
    strokeRightWeight: 0,
    strokeBottomWeight: 0,
    strokeLeftWeight: 0
  }));
  assert.deepEqual(out.individualStrokes, { top: 1, right: 0, bottom: 0, left: 0 });
});

test("individualStrokes are omitted when all frame stroke weights match", () => {
  const out = extractFrameLike(mockFrame({
    strokeTopWeight: 2,
    strokeRightWeight: 2,
    strokeBottomWeight: 2,
    strokeLeftWeight: 2
  }));
  assert.equal("individualStrokes" in out, false);
});

test("gradientTransform rotation matrix is preserved with round2", () => {
  const paints = normalizePaints([{
    type: "GRADIENT_LINEAR",
    gradientStops: [
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
    ],
    gradientTransform: [[0.7071, -0.7071, 0.1234], [0.7071, 0.7071, 0.9876]]
  }]);
  assert.deepEqual(paints?.[0], {
    type: "GRADIENT_LINEAR",
    stops: [
      { position: 0, color: "#ff0000" },
      { position: 1, color: "#0000ff" }
    ],
    gradientTransform: [[0.71, -0.71, 0.12], [0.71, 0.71, 0.99]]
  });
});

test("gradientTransform identity matrix is omitted", () => {
  const paints = normalizePaints([{
    type: "GRADIENT_RADIAL",
    gradientStops: [
      { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } }
    ],
    gradientTransform: [[1, 0, 0], [0, 1, 0]]
  }]);
  assert.equal("gradientTransform" in (paints?.[0] ?? {}), false);
});
