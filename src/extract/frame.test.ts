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

const BASE_BOX = { x: 100, y: 200, width: 50, height: 40 };

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

test("image paint preserves explicit rotation and scalingFactor with round2", () => {
  const paints = normalizePaints([{
    type: "IMAGE",
    imageHash: "hash-1",
    scaleMode: "TILE",
    rotation: 12.345,
    scalingFactor: 1.234
  }]);
  assert.deepEqual(paints?.[0], {
    type: "IMAGE",
    imageHash: "hash-1",
    scaleMode: "TILE",
    rotation: 12.35,
    scalingFactor: 1.23
  });
});

test("image paint omits default rotation, scalingFactor, and identity cropRect", () => {
  const paints = normalizePaints([{
    type: "IMAGE",
    imageHash: "hash-2",
    rotation: 0,
    scalingFactor: 1,
    imageTransform: [[1, 0, 0], [0, 1, 0]]
  }]);
  assert.deepEqual(paints?.[0], {
    type: "IMAGE",
    imageHash: "hash-2"
  });
});

test("image paint extracts cropRect from non-rotated imageTransform", () => {
  const paints = normalizePaints([{
    type: "IMAGE",
    imageHash: "hash-3",
    imageTransform: [[0.333, 0, 0.125], [0, 0.666, 0.25]]
  }]);
  assert.deepEqual(paints?.[0], {
    type: "IMAGE",
    imageHash: "hash-3",
    cropRect: { x: 0.13, y: 0.25, w: 0.33, h: 0.67 }
  });
});

test("image paint derives rotation from rotated imageTransform and skips cropRect", () => {
  const paints = normalizePaints([{
    type: "IMAGE",
    imageHash: "hash-4",
    imageTransform: [[0, -1, 0.1], [1, 0, 0.2]]
  }]);
  assert.deepEqual(paints?.[0], {
    type: "IMAGE",
    imageHash: "hash-4",
    rotation: 90
  });
});

test("DROP_SHADOW with positive offset expands renderBox to the right and bottom", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [{
      type: "DROP_SHADOW",
      offset: { x: 10, y: 10 },
      radius: 8,
      spread: 2
    }]
  }));

  assert.deepEqual(out.box, { x: 100, y: 200, w: 50, h: 40 });
  assert.deepEqual(out.renderBox, { x: 100, y: 200, w: 70, h: 60 });
});

test("DROP_SHADOW with negative offset expands renderBox to the left and top", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [{
      type: "DROP_SHADOW",
      offset: { x: -5, y: -5 },
      radius: 4,
      spread: 0
    }]
  }));

  assert.deepEqual(out.renderBox, { x: 91, y: 191, w: 59, h: 49 });
});

test("INNER_SHADOW does not emit renderBox", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [{
      type: "INNER_SHADOW",
      offset: { x: 10, y: 10 },
      radius: 8,
      spread: 2
    }]
  }));

  assert.equal("renderBox" in out, false);
});

test("subpixel shadow expansion at or below 0.5px omits renderBox", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [{
      type: "DROP_SHADOW",
      offset: { x: 0, y: 0 },
      radius: 0.3,
      spread: 0
    }]
  }));

  assert.equal("renderBox" in out, false);
});

test("LAYER_BLUR expands renderBox on all sides by radius", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [{
      type: "LAYER_BLUR",
      radius: 10
    }]
  }));

  assert.deepEqual(out.renderBox, { x: 90, y: 190, w: 70, h: 60 });
});

test("multiple effects union into the largest renderBox envelope", () => {
  const out = extractFrameLike(mockFrame({
    ...BASE_BOX,
    effects: [
      {
        type: "DROP_SHADOW",
        offset: { x: 20, y: 0 },
        radius: 5,
        spread: 0
      },
      {
        type: "LAYER_BLUR",
        radius: 10
      },
      {
        type: "DROP_SHADOW",
        visible: false,
        offset: { x: -100, y: -100 },
        radius: 20
      }
    ]
  }));

  assert.deepEqual(out.renderBox, { x: 90, y: 190, w: 85, h: 60 });
});

test("rotated nodes preserve relativeTransform with round2", () => {
  const out = extractFrameLike(mockFrame({
    rotation: 30,
    relativeTransform: [[0.8660254, -0.5, 10.123], [0.5, 0.8660254, 20.987]]
  }));

  assert.deepEqual(out.relativeTransform, [[0.87, -0.5, 10.12], [0.5, 0.87, 20.99]]);
});

test("non-rotated nodes omit relativeTransform", () => {
  const out = extractFrameLike(mockFrame({
    rotation: 0,
    relativeTransform: [[1, 0, 10], [0, 1, 20]]
  }));

  assert.equal("relativeTransform" in out, false);
});

test("mixed cornerRadius emits per-corner radii", () => {
  const out = extractFrameLike(mockFrame({
    cornerRadius: Symbol("figma.mixed"),
    topLeftRadius: 1.234,
    topRightRadius: 2,
    bottomRightRadius: 3,
    bottomLeftRadius: 4
  }));

  assert.deepEqual(out.cornerRadii, { tl: 1.23, tr: 2, br: 3, bl: 4 });
  assert.equal("cornerRadius" in out, false);
});

test("per-corner radii emit without a mixed cornerRadius sentinel", () => {
  const out = extractFrameLike(mockFrame({
    topLeftRadius: 0,
    topRightRadius: 8,
    bottomRightRadius: 8,
    bottomLeftRadius: 0
  }));

  assert.deepEqual(out.cornerRadii, { tl: 0, tr: 8, br: 8, bl: 0 });
});

test("all-zero per-corner radii are omitted", () => {
  const out = extractFrameLike(mockFrame({
    cornerRadius: Symbol("figma.mixed"),
    topLeftRadius: 0,
    topRightRadius: 0,
    bottomRightRadius: 0,
    bottomLeftRadius: 0
  }));

  assert.equal("cornerRadii" in out, false);
});

test("uniform non-zero cornerRadius emits the compact field", () => {
  const out = extractFrameLike(mockFrame({
    cornerRadius: 12.345,
    topLeftRadius: 1,
    topRightRadius: 2,
    bottomRightRadius: 3,
    bottomLeftRadius: 4
  }));

  assert.equal(out.cornerRadius, 12.35);
  assert.equal("cornerRadii" in out, false);
});
