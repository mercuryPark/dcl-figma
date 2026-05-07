// Slim transform tests. The Slim sectionTree carries inline layout hints — the only
// place in Slim mode where layout intent (stack / wrap / justify / align / gap / padding)
// survives, so regressions here directly impact LLM consumers.

import test from "node:test";
import assert from "node:assert/strict";
import { toSlim } from "./toSlim";
import type { DesignFull, AnyNode } from "../schema";

function makeFull(children: AnyNode[]): DesignFull {
  return {
    $schema: "https://example/schemas/2.0.json",
    schemaVersion: "2.0",
    _howToUse: "test",
    meta: {
      fileKey: null,
      fileName: "Test",
      pageId: "p1",
      pageName: "Page 1",
      tool: "test",
      generatedAt: "2026-05-07T00:00:00Z",
      degraded: [],
      stats: { totalNodes: 0, svgExported: 0, svgFailed: 0, variablesError: false }
    },
    tokens: { colors: [], typography: [], effects: [], variables: [] },
    pages: [{ id: "p1", name: "Page 1", children }],
    components: []
  };
}

test("layout hint: hstack with gap and uniform padding", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Login",
      layoutMode: "HORIZONTAL",
      itemSpacing: 12,
      paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16,
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /\[hstack, gap=12, p=16\]/);
});

test("layout hint: vstack-only with no spacing emits empty hint", () => {
  const slim = toSlim(makeFull([
    { id: "f", type: "FRAME", name: "Stack", layoutMode: "VERTICAL", children: [] }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /FRAME: Stack \[vstack\]/);
});

test("layout hint: wrap layout with justify, align, gap, gapY", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Wrapped",
      layoutMode: "HORIZONTAL", layoutWrap: "WRAP",
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      itemSpacing: 8, counterAxisSpacing: 4,
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /hstack/);
  assert.match(tree, /wrap/);
  assert.match(tree, /justify=space-between/);
  assert.match(tree, /align=center/);
  assert.match(tree, /gap=8/);
  assert.match(tree, /gapY=4/);
});

test("layout hint: justify=center / align=end mapping", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Centered",
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "MAX",
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /justify=center/);
  assert.match(tree, /align=end/);
});

test("layout hint: MIN values are pruned (default, no noise)", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Default",
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 4,
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.doesNotMatch(tree, /justify/);
  assert.doesNotMatch(tree, /align/);
  assert.match(tree, /\[hstack, gap=4\]/);
});

test("layout hint: padding shorthand for symmetric values (vertical vs horizontal)", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Sym",
      paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16,
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /\[p=8 16\]/);
});

test("layout hint: padding 4-tuple when fully asymmetric", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Asym",
      paddingTop: 1, paddingRight: 2, paddingBottom: 3, paddingLeft: 4,
      children: []
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /\[p=1 2 3 4\]/);
});

test("layout hint: non-frame nodes carry no hint", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Wrap",
      children: [
        { id: "t", type: "TEXT", name: "Hi", characters: "Hi", style: {} }
      ]
    }
  ]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /TEXT: Hi$/m);
  assert.doesNotMatch(tree, /TEXT: Hi \[/);
});

test("textSummary: collects non-empty trimmed text in DFS order, respects limit", () => {
  const slim = toSlim(makeFull([
    {
      id: "f", type: "FRAME", name: "Frame",
      children: [
        { id: "t1", type: "TEXT", name: "T1", characters: "Hello", style: {} },
        { id: "t2", type: "TEXT", name: "T2", characters: "  ", style: {} },
        { id: "t3", type: "TEXT", name: "T3", characters: "World", style: {} }
      ]
    }
  ]));
  assert.deepEqual(slim.screens[0]?.textSummary, ["Hello", "World"]);
});

test("sectionTree: depth limit respected (default 3)", () => {
  const deep: AnyNode = {
    id: "d1", type: "FRAME", name: "L1",
    children: [{
      id: "d2", type: "FRAME", name: "L2",
      children: [{
        id: "d3", type: "FRAME", name: "L3",
        children: [{
          id: "d4", type: "FRAME", name: "L4-should-not-appear",
          children: []
        }]
      }]
    }]
  };
  const slim = toSlim(makeFull([deep]));
  const tree = slim.screens[0]?.sectionTree ?? "";
  assert.match(tree, /L1/);
  assert.match(tree, /L2/);
  assert.match(tree, /L3/);
  assert.doesNotMatch(tree, /L4-should-not-appear/);
});
