import test from "node:test";
import assert from "node:assert/strict";
import { iterateChunks, sendJsonInChunks, totalChunks, type TransportMessage } from "./chunk";

function reassemble(messages: TransportMessage[], kind: "slim" | "full"): string {
  const chunks = messages
    .filter((msg): msg is Extract<TransportMessage, { type: "chunk" }> => msg.type === "chunk" && msg.kind === kind)
    .sort((a, b) => a.seq - b.seq);
  return chunks.map((msg) => msg.data).join("");
}

test("iterateChunks splits and reassembles a JSON string", () => {
  const json = JSON.stringify({ text: "abcdefghijklmnopqrstuvwxyz" });
  const chunks = Array.from(iterateChunks(json, 7));

  assert.equal(chunks.length, Math.ceil(json.length / 7));
  assert.deepEqual(chunks.map((chunk) => chunk.seq), chunks.map((_, index) => index));
  assert.equal(chunks.map((chunk) => chunk.data).join(""), json);
});

test("totalChunks returns one for an empty payload", () => {
  assert.equal(totalChunks("", 10), 1);
});

test("totalChunks rounds up partial final chunks", () => {
  assert.equal(totalChunks("12345678901", 5), 3);
});

test("sendJsonInChunks posts chunk messages followed by done", async () => {
  const messages: TransportMessage[] = [];
  const total = await sendJsonInChunks({ postMessage: (msg) => messages.push(msg) }, "slim", "abcdefghij", {
    chunkSize: 4,
    yieldEvery: 99
  });

  assert.equal(total, 3);
  assert.deepEqual(messages, [
    { type: "chunk", kind: "slim", seq: 0, data: "abcd" },
    { type: "chunk", kind: "slim", seq: 1, data: "efgh" },
    { type: "chunk", kind: "slim", seq: 2, data: "ij" },
    { type: "done", kind: "slim", totalSeq: 3 }
  ]);
});

test("multi-kind chunk streams can be interleaved and reassembled by kind", async () => {
  const slim: TransportMessage[] = [];
  const full: TransportMessage[] = [];
  await sendJsonInChunks({ postMessage: (msg) => slim.push(msg) }, "slim", "slim-payload", { chunkSize: 4, yieldEvery: 99 });
  await sendJsonInChunks({ postMessage: (msg) => full.push(msg) }, "full", "full-payload", { chunkSize: 3, yieldEvery: 99 });

  const interleaved = [slim[0], full[0], slim[1], full[1], slim[2], full[2], slim[3], full[3], full[4]]
    .filter((msg): msg is TransportMessage => !!msg);

  assert.equal(reassemble(interleaved, "slim"), "slim-payload");
  assert.equal(reassemble(interleaved, "full"), "full-payload");
  assert.deepEqual(interleaved.filter((msg) => msg.type === "done").map((msg) => msg.kind).sort(), ["full", "slim"]);
});
