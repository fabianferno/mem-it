import { upsertNode, upsertNodeByLabel, insertEdge, getGraph } from "./graph";
import { insertChunk, searchChunks } from "./chunks";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

const vec = (x: number) => {
  const a = new Float32Array(8).fill(0);
  a[0] = x;
  a[1] = 1 - x;
  return a;
};

test("near-duplicate same-type node merges and bumps mentionCount", () => {
  const a = upsertNode({ label: "QVAC", type: "tech", embedding: vec(1.0), meetingId: "m1" });
  const b = upsertNode({ label: "Q.V.A.C", type: "tech", embedding: vec(0.99), meetingId: "m2" });
  expect(b.merged).toBe(true);
  expect(b.id).toBe(a.id);
  expect(getGraph().nodes.find((n) => n.id === a.id)!.mentionCount).toBe(2);
});

test("upsertNodeByLabel merges case-insensitively, no embedding needed", () => {
  const a = upsertNodeByLabel({ label: "QVAC", type: "tech", meetingId: "m1" });
  const b = upsertNodeByLabel({ label: "  qvac ", type: "tech", meetingId: "m2" });
  expect(b.merged).toBe(true);
  expect(b.id).toBe(a.id);
  const c = upsertNodeByLabel({ label: "Privacy", type: "value", meetingId: "m1" });
  expect(c.merged).toBe(false);
  expect(getGraph().nodes.find((n) => n.id === a.id)!.mentionCount).toBe(2);
});

test("distinct concept does not merge", () => {
  upsertNode({ label: "QVAC", type: "tech", embedding: vec(1.0), meetingId: "m1" });
  const c = upsertNode({ label: "Privacy", type: "value", embedding: vec(0.0), meetingId: "m1" });
  expect(c.merged).toBe(false);
  expect(getGraph().nodes).toHaveLength(2);
});

test("edges are stored and returned by getGraph", () => {
  const a = upsertNode({ label: "A", type: "tech", embedding: vec(1.0), meetingId: "m1" });
  const b = upsertNode({ label: "B", type: "value", embedding: vec(0.0), meetingId: "m1" });
  insertEdge({ srcId: a.id, dstId: b.id, relation: "enables", meetingId: "m1" });
  const g = getGraph();
  expect(g.edges).toHaveLength(1);
  expect(g.edges[0]).toMatchObject({ srcNodeId: a.id, dstNodeId: b.id, relation: "enables" });
});

test("searchChunks returns most similar chunk first", () => {
  insertChunk({ meetingId: "m1", text: "about privacy", startMs: 0, embedding: vec(0.0) });
  insertChunk({ meetingId: "m1", text: "about qvac tech", startMs: 0, embedding: vec(1.0) });
  const hits = searchChunks(vec(0.95), 1);
  expect(hits[0].chunk.text).toBe("about qvac tech");
});
