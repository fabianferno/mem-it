// Pure vector helpers. Embeddings are stored in SQLite as Float32 BLOBs and
// similarity is brute-force cosine in JS (no native vector extension). At
// hundreds-to-thousands of vectors this is fast and dependency-free.

/** Copy a Float32Array into a standalone byte buffer suitable for a SQLite BLOB. */
export function f32ToBlob(v: Float32Array): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice();
}

/** Reconstruct a Float32Array from a BLOB read back out of SQLite. */
export function blobToF32(b: Uint8Array): Float32Array {
  const copy = b.slice(); // own an aligned, 0-offset buffer
  return new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
}

/** Cosine similarity in [-1, 1]; returns 0 for a zero-length vector (no NaN). */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Top-k items by cosine similarity to `query`, highest score first. */
export function topK(
  query: Float32Array,
  items: { id: string; vec: Float32Array }[],
  k: number
): { id: string; score: number }[] {
  return items
    .map((it) => ({ id: it.id, score: cosine(query, it.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
