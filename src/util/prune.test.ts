import test from "node:test";
import assert from "node:assert/strict";
import { prune, round2, roundBox } from "./prune";

test("prune removes default-equivalent fields", () => {
  const out = prune({
    id: "node-1",
    visible: true,
    opacity: 1,
    rotation: 0,
    blendMode: "NORMAL",
    locked: false
  });

  assert.deepEqual(out, { id: "node-1" });
});

test("prune removes nullish and empty containers", () => {
  const out = prune({
    id: "node-1",
    missing: null,
    nope: undefined,
    emptyArray: [],
    emptyObject: {},
    fills: [{ type: "SOLID" }]
  });

  assert.deepEqual(out, {
    id: "node-1",
    fills: [{ type: "SOLID" }]
  });
});

test("prune keeps non-default falsy values", () => {
  const out = prune({
    visible: false,
    opacity: 0,
    rotation: -15,
    locked: true,
    count: 0,
    label: ""
  });

  assert.deepEqual(out, {
    visible: false,
    opacity: 0,
    rotation: -15,
    locked: true,
    count: 0,
    label: ""
  });
});

test("round2 handles negative and very large numbers", () => {
  assert.equal(round2(-1.235), -1.24);
  assert.equal(round2(123456789.98765), 123456789.99);
});

test("round2 and roundBox tolerate NaN without throwing", () => {
  assert.equal(Number.isNaN(round2(Number.NaN)), true);
  const box = roundBox({ x: Number.NaN, y: -0.004, w: 10.005, h: 20 });
  assert.equal(Number.isNaN(box.x), true);
  assert.equal(box.y, -0);
  assert.equal(box.w, 10.01);
  assert.equal(box.h, 20);
});
