import test from "node:test";
import assert from "node:assert/strict";
import { collectVariables } from "./variables";

function setFigmaMock(variables: unknown[]): void {
  (globalThis as unknown as { figma: unknown }).figma = {
    variables: {
      getLocalVariablesAsync: async () => variables,
      getVariableCollectionByIdAsync: async (id: string) => ({
        id,
        name: "Collection",
        modes: [{ modeId: "m1", name: "Light" }]
      })
    }
  };
}

test("collectVariables preserves variable scopes and codeSyntax", async () => {
  setFigmaMock([{
    id: "var-1",
    name: "Color/Primary",
    resolvedType: "COLOR",
    variableCollectionId: "collection-1",
    valuesByMode: { m1: { r: 1, g: 0, b: 0, a: 1 } },
    scopes: ["FRAME_FILL", "TEXT_FILL", 123],
    codeSyntax: {
      WEB: "var(--color-primary)",
      ANDROID: "R.color.primary",
      iOS: "UIColor.primary",
      EXTRA: "ignored"
    }
  }]);

  const result = await collectVariables();

  assert.equal(result.error, false);
  assert.deepEqual(result.entries[0], {
    id: "var-1",
    name: "Color/Primary",
    collectionName: "Collection",
    resolvedType: "COLOR",
    value: "#ff0000",
    modeId: "m1",
    modeName: "Light",
    scope: ["FRAME_FILL", "TEXT_FILL"],
    codeSyntax: {
      WEB: "var(--color-primary)",
      ANDROID: "R.color.primary",
      iOS: "UIColor.primary"
    }
  });
});

test("collectVariables omits empty scopes and codeSyntax", async () => {
  setFigmaMock([{
    id: "var-2",
    name: "Spacing/Small",
    resolvedType: "FLOAT",
    variableCollectionId: "collection-1",
    valuesByMode: { m1: 8 },
    scopes: [],
    codeSyntax: {}
  }]);

  const result = await collectVariables();

  assert.equal(result.error, false);
  assert.equal("scope" in (result.entries[0] ?? {}), false);
  assert.equal("codeSyntax" in (result.entries[0] ?? {}), false);
});
