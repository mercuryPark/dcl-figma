// postMessage transport: serialized payload → 500KB slices → sequential chunk messages.
// The sandbox NEVER posts the dump object directly; it only posts JSON string slices so
// Figma's structured clone stays O(1) per call.

export const CHUNK_SIZE = 500 * 1024;

export type ChunkKind = "slim" | "full";

export interface ChunkMessage {
  type: "chunk";
  kind: ChunkKind;
  seq: number;
  data: string;
}

export interface DoneMessage {
  type: "done";
  kind: ChunkKind;
  totalSeq: number;
}

export type TransportMessage = ChunkMessage | DoneMessage;

export function* iterateChunks(json: string, chunkSize: number = CHUNK_SIZE): Generator<{ seq: number; data: string }> {
  let seq = 0;
  for (let i = 0; i < json.length; i += chunkSize) {
    yield { seq, data: json.slice(i, i + chunkSize) };
    seq++;
  }
}

export function totalChunks(json: string, chunkSize: number = CHUNK_SIZE): number {
  return Math.max(1, Math.ceil(json.length / chunkSize));
}

export interface ChunkSender {
  postMessage(msg: TransportMessage): void;
}

export async function sendJsonInChunks(
  sender: ChunkSender,
  kind: ChunkKind,
  json: string,
  opts: { yieldEvery?: number; chunkSize?: number } = {}
): Promise<number> {
  const chunkSize = opts.chunkSize ?? CHUNK_SIZE;
  const yieldEvery = opts.yieldEvery ?? 4;
  let seq = 0;
  for (const c of iterateChunks(json, chunkSize)) {
    sender.postMessage({ type: "chunk", kind, seq: c.seq, data: c.data });
    seq = c.seq;
    if ((seq + 1) % yieldEvery === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  const total = seq + 1;
  sender.postMessage({ type: "done", kind, totalSeq: total });
  return total;
}
