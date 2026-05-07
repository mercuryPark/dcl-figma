import test from "node:test";
import assert from "node:assert/strict";
import { extractText } from "./text";

const MIXED = Symbol("figma.mixed");

function mockText(overrides: Record<string, unknown> = {}): TextNode {
  return {
    id: "text-1",
    type: "TEXT",
    name: "Text",
    visible: true,
    locked: false,
    characters: "Hello",
    ...overrides
  } as unknown as TextNode;
}

test("mixed fontSize and fontName emits merged text style runs", async () => {
  let calls = 0;
  const out = await extractText(mockText({
    fontName: MIXED,
    fontSize: MIXED,
    getStyledTextSegments(fields: readonly string[]) {
      calls++;
      assert.deepEqual(fields, ["fontName", "fontSize", "lineHeight", "letterSpacing", "fills", "textCase", "textDecoration"]);
      return [
        {
          start: 0,
          end: 2,
          fontName: { family: "Inter", style: "Regular" },
          fontSize: 12.125,
          lineHeight: { unit: "PERCENT", value: 120 },
          letterSpacing: { unit: "PIXELS", value: 0.5 },
          fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }]
        },
        {
          start: 2,
          end: 4,
          fontName: { family: "Inter", style: "Regular" },
          fontSize: 12.125,
          lineHeight: { unit: "PERCENT", value: 120 },
          letterSpacing: { unit: "PIXELS", value: 0.5 },
          fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }]
        },
        {
          start: 4,
          end: 5,
          fontName: { family: "JetBrains Mono", style: "Bold" },
          fontSize: 16,
          lineHeight: { unit: "AUTO" },
          letterSpacing: { unit: "PERCENT", value: 2 },
          fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 1 }, opacity: 0.5 }],
          textCase: "UPPER",
          textDecoration: "UNDERLINE"
        }
      ];
    }
  }));

  assert.equal(calls, 1);
  assert.deepEqual(out.style.runs, [
    {
      start: 0,
      end: 4,
      fontFamily: "Inter",
      fontStyle: "Regular",
      fontSize: 12.13,
      lineHeight: "120%",
      letterSpacing: "0.5px",
      fills: [{ type: "SOLID", color: "#ff0000" }]
    },
    {
      start: 4,
      end: 5,
      fontFamily: "JetBrains Mono",
      fontStyle: "Bold",
      fontSize: 16,
      lineHeight: "AUTO",
      letterSpacing: "2%",
      fills: [{ type: "SOLID", color: "#0000ff80" }],
      textCase: "UPPER",
      textDecoration: "UNDERLINE"
    }
  ]);
  assert.equal("fontFamily" in out.style, false);
  assert.equal("fontSize" in out.style, false);
});

test("single-style text does not emit text style runs", async () => {
  let calls = 0;
  const out = await extractText(mockText({
    fontName: { family: "Inter", style: "Regular" },
    fontSize: 14,
    lineHeight: { unit: "PERCENT", value: 140 },
    letterSpacing: { unit: "PIXELS", value: 0.25 },
    getStyledTextSegments() {
      calls++;
      return [];
    }
  }));

  assert.equal(calls, 0);
  assert.deepEqual(out.style, {
    fontFamily: "Inter",
    fontStyle: "Regular",
    fontSize: 14,
    lineHeight: "140%",
    letterSpacing: "0.25px"
  });
});

test("mixed fontSize keeps uniform top-level fontName and emits async runs", async () => {
  const out = await extractText(mockText({
    fontName: { family: "Inter", style: "Medium" },
    fontSize: MIXED,
    async getStyledTextSegments() {
      return [
        {
          start: 0,
          end: 2,
          fontName: { family: "Inter", style: "Medium" },
          fontSize: 12
        },
        {
          start: 2,
          end: 5,
          fontName: { family: "Inter", style: "Medium" },
          fontSize: 18
        }
      ];
    }
  }));

  assert.equal(out.style.fontFamily, "Inter");
  assert.equal(out.style.fontStyle, "Medium");
  assert.equal("fontSize" in out.style, false);
  assert.deepEqual(out.style.runs, [
    { start: 0, end: 2, fontFamily: "Inter", fontStyle: "Medium", fontSize: 12 },
    { start: 2, end: 5, fontFamily: "Inter", fontStyle: "Medium", fontSize: 18 }
  ]);
});

test("empty text omits runs even when style fields are mixed", async () => {
  let calls = 0;
  const out = await extractText(mockText({
    characters: "",
    fontSize: MIXED,
    getStyledTextSegments() {
      calls++;
      return [{ start: 0, end: 0, fontSize: 12 }];
    }
  }));

  assert.equal(calls, 0);
  assert.equal("runs" in out.style, false);
});
