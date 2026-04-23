// UI-side reassembler for the chunked transport protocol.

import type { ChunkKind, TransportMessage } from "../transport/chunk";

export interface ReceiveState {
  buffers: Record<ChunkKind, string[]>;
  completed: Record<ChunkKind, boolean>;
}

export function createReceiveState(): ReceiveState {
  return {
    buffers: { slim: [], full: [] },
    completed: { slim: false, full: false }
  };
}

export interface HandleResult {
  kind?: ChunkKind;
  done?: boolean;
  /** Present only when this call completes a kind — the reassembled JSON string. */
  assembled?: string;
  error?: string;
}

export function handleMessage(state: ReceiveState, msg: TransportMessage): HandleResult {
  if (msg.type === "chunk") {
    const { kind, seq, data } = msg;
    const buf = state.buffers[kind];
    buf[seq] = data;
    return { kind };
  }
  if (msg.type === "done") {
    const { kind, totalSeq } = msg;
    const buf = state.buffers[kind];
    if (buf.length !== totalSeq) {
      return { kind, error: `missing chunks: expected ${totalSeq}, got ${buf.length}` };
    }
    for (let i = 0; i < totalSeq; i++) {
      if (typeof buf[i] !== "string") return { kind, error: `missing chunk seq=${i}` };
    }
    const assembled = buf.join("");
    state.completed[kind] = true;
    return { kind, done: true, assembled };
  }
  return { error: "unknown message type" };
}
