import type { Chunk } from "../types";
import { openDb, newId } from "./sqlite";
import { f32ToBlob, blobToF32, topK } from "./vectors";

export function insertChunk(p: {
  meetingId: string;
  text: string;
  startMs: number;
  embedding: Float32Array;
}): string {
  const id = newId();
  openDb().runSync(
    `INSERT INTO chunks (id, meeting_id, text, start_ms, embedding) VALUES (?, ?, ?, ?, ?)`,
    [id, p.meetingId, p.text, p.startMs, f32ToBlob(p.embedding)]
  );
  return id;
}

/** All chunks for one meeting, with embeddings — used to export a shareable bundle. */
export function getChunksByMeeting(
  meetingId: string
): { text: string; startMs: number; embedding: Float32Array }[] {
  const rows = openDb().getAllSync(
    `SELECT text, start_ms, embedding FROM chunks WHERE meeting_id = ?`,
    [meetingId]
  ) as { text: string; start_ms: number; embedding: Uint8Array }[];
  return rows.map((r) => ({
    text: r.text,
    startMs: r.start_ms,
    embedding: blobToF32(r.embedding),
  }));
}

/** Brute-force cosine top-k over all stored transcript chunks. */
export function searchChunks(
  queryVec: Float32Array,
  k: number
): { chunk: Chunk; score: number }[] {
  const rows = openDb().getAllSync(
    `SELECT id, meeting_id, text, start_ms, embedding FROM chunks`
  ) as { id: string; meeting_id: string; text: string; start_ms: number; embedding: Uint8Array }[];

  const byId = new Map(rows.map((r) => [r.id, r]));
  const scored = topK(
    queryVec,
    rows.map((r) => ({ id: r.id, vec: blobToF32(r.embedding) })),
    k
  );
  return scored.map((s) => {
    const r = byId.get(s.id)!;
    return {
      chunk: { id: r.id, meetingId: r.meeting_id, text: r.text, startMs: r.start_ms },
      score: s.score,
    };
  });
}
