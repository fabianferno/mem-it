import type { GraphNode, GraphEdge, NodeType } from "../types";
import { openDb, newId } from "./sqlite";
import { cosine, f32ToBlob, blobToF32 } from "./vectors";

// Two same-type nodes whose embeddings exceed this cosine are treated as the
// same concept and merged (this is what makes the brain graph densify across
// meetings instead of fragmenting into near-duplicates).
export const MERGE_THRESHOLD = 0.82;

export function upsertNode(p: {
  label: string;
  type: NodeType;
  embedding: Float32Array;
  meetingId: string;
}): { id: string; merged: boolean } {
  const db = openDb();
  const rows = db.getAllSync(`SELECT id, embedding FROM nodes WHERE type = ?`, [p.type]) as {
    id: string;
    embedding: Uint8Array;
  }[];

  let best = { id: "", score: 0 };
  for (const r of rows) {
    const s = cosine(p.embedding, blobToF32(r.embedding));
    if (s > best.score) best = { id: r.id, score: s };
  }

  if (best.id && best.score > MERGE_THRESHOLD) {
    const cur = db.getFirstSync(`SELECT mention_count FROM nodes WHERE id = ?`, [best.id]) as {
      mention_count: number;
    } | null;
    db.runSync(`UPDATE nodes SET mention_count = ? WHERE id = ?`, [
      (cur?.mention_count ?? 1) + 1,
      best.id,
    ]);
    return { id: best.id, merged: true };
  }

  const id = newId();
  db.runSync(
    `INSERT INTO nodes (id, label, type, embedding, mention_count, first_meeting_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, p.label, p.type, f32ToBlob(p.embedding), 1, p.meetingId, Date.now()]
  );
  return { id, merged: false };
}

/**
 * Merge a node by normalized label (no embedding needed) so the graph persists
 * the instant extraction emits it — decoupled from the slow embedding stage.
 * Same-label, same-type nodes merge and bump mentionCount across meetings.
 */
export function upsertNodeByLabel(p: {
  label: string;
  type: NodeType;
  meetingId: string;
}): { id: string; merged: boolean } {
  const db = openDb();
  const norm = (s: string) => s.trim().toLowerCase();
  const rows = db.getAllSync(`SELECT id, label FROM nodes WHERE type = ?`, [p.type]) as {
    id: string;
    label: string;
  }[];
  const match = rows.find((r) => norm(r.label) === norm(p.label));
  if (match) {
    const cur = db.getFirstSync(`SELECT mention_count FROM nodes WHERE id = ?`, [match.id]) as {
      mention_count: number;
    } | null;
    db.runSync(`UPDATE nodes SET mention_count = ? WHERE id = ?`, [
      (cur?.mention_count ?? 1) + 1,
      match.id,
    ]);
    return { id: match.id, merged: true };
  }
  const id = newId();
  db.runSync(
    `INSERT INTO nodes (id, label, type, embedding, mention_count, first_meeting_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, p.label, p.type, null, 1, p.meetingId, Date.now()]
  );
  return { id, merged: false };
}

export function insertEdge(p: {
  srcId: string;
  dstId: string;
  relation: string;
  meetingId: string;
}): string {
  const id = newId();
  openDb().runSync(
    `INSERT INTO edges (id, src_node_id, dst_node_id, relation, weight, meeting_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, p.srcId, p.dstId, p.relation, 1, p.meetingId]
  );
  return id;
}

export function getGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const db = openDb();
  const nrows = db.getAllSync(`SELECT * FROM nodes`) as any[];
  const erows = db.getAllSync(`SELECT * FROM edges`) as any[];
  return {
    nodes: nrows.map((r) => ({
      id: r.id,
      label: r.label,
      type: r.type,
      mentionCount: r.mention_count,
      firstMeetingId: r.first_meeting_id,
      createdAt: r.created_at,
    })),
    edges: erows.map((r) => ({
      id: r.id,
      srcNodeId: r.src_node_id,
      dstNodeId: r.dst_node_id,
      relation: r.relation,
      weight: r.weight,
      meetingId: r.meeting_id,
    })),
  };
}
