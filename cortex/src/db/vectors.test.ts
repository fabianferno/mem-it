import { f32ToBlob, blobToF32, cosine, topK } from "./vectors";

test("blob round-trips a float32 vector", () => {
  const v = new Float32Array([0.1, -0.2, 0.3, 1, 0]);
  const back = blobToF32(f32ToBlob(v));
  expect(Array.from(back)).toEqual(Array.from(v));
});

test("cosine: identical vectors = 1, orthogonal = 0", () => {
  const a = new Float32Array([1, 0, 0]);
  const b = new Float32Array([0, 1, 0]);
  expect(cosine(a, a)).toBeCloseTo(1, 6);
  expect(cosine(a, b)).toBeCloseTo(0, 6);
});

test("cosine: zero vector yields 0 (no NaN)", () => {
  const a = new Float32Array([0, 0, 0]);
  const b = new Float32Array([1, 2, 3]);
  expect(cosine(a, b)).toBe(0);
});

test("topK returns the k most similar, sorted desc", () => {
  const q = new Float32Array([1, 0]);
  const items = [
    { id: "x", vec: new Float32Array([0, 1]) }, // 0
    { id: "y", vec: new Float32Array([1, 0]) }, // 1
    { id: "z", vec: new Float32Array([0.7, 0.7]) }, // ~.707
  ];
  const r = topK(q, items, 2);
  expect(r.map((x) => x.id)).toEqual(["y", "z"]);
  expect(r[0].score).toBeGreaterThan(r[1].score);
});
