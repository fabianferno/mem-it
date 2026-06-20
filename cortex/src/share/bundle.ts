import type { NodeType } from "../types";
import {
  createMeeting,
  updateMeeting,
  addActionItem,
  toggleActionItem,
  getMeeting,
  getActionItems,
} from "../db/meetings";
import { getChunksByMeeting, insertChunk } from "../db/chunks";
import { getGraph, upsertNodeByLabel, insertEdge } from "../db/graph";

/**
 * A portable, fully-offline "memory bundle" — one meeting plus its action items,
 * transcript-chunk embeddings, and graph subgraph. Serialized to a `.memit` file
 * you AirDrop to another device, where it merges into the recipient's brain graph
 * and RAG index. No cloud, no server — peer-to-peer second-brain sharing.
 */
export const MEMIT_BUNDLE_SCHEMA = "memit.bundle.v1";

export interface MemitBundle {
  schema: typeof MEMIT_BUNDLE_SCHEMA;
  exportedAt: string;
  meeting: {
    title: string;
    startedAt: number;
    endedAt: number | null;
    transcript: string | null;
    summary: string | null;
  };
  actionItems: { text: string; done: boolean }[];
  /** Embeddings travel as plain number[] so the recipient never re-embeds. */
  chunks: { text: string; startMs: number; embedding: number[] }[];
  nodes: { label: string; type: NodeType }[];
  edges: { srcLabel: string; dstLabel: string; relation: string }[];
}

export interface ImportResult {
  meetingId: string;
  chunks: number;
  actionItems: number;
  nodesAdded: number;
  nodesMerged: number;
  edges: number;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Read a meeting and everything it owns into a serializable bundle. */
export function buildBundle(meetingId: string, exportedAt: string): MemitBundle {
  const meeting = getMeeting(meetingId);
  if (!meeting) throw new Error("Meeting not found.");

  const actionItems = getActionItems(meetingId).map((a) => ({ text: a.text, done: a.done }));
  const chunks = getChunksByMeeting(meetingId).map((c) => ({
    text: c.text,
    startMs: c.startMs,
    embedding: Array.from(c.embedding),
  }));

  // Subgraph: edges from this meeting + the nodes they touch + nodes it introduced.
  const { nodes, edges } = getGraph();
  const idToNode = new Map(nodes.map((n) => [n.id, n]));
  const meetingEdges = edges.filter((e) => e.meetingId === meetingId);
  const nodeIds = new Set<string>();
  for (const e of meetingEdges) {
    nodeIds.add(e.srcNodeId);
    nodeIds.add(e.dstNodeId);
  }
  for (const n of nodes) if (n.firstMeetingId === meetingId) nodeIds.add(n.id);

  const bundleNodes = [...nodeIds]
    .map((id) => idToNode.get(id))
    .filter((n): n is NonNullable<typeof n> => !!n)
    .map((n) => ({ label: n.label, type: n.type }));

  const bundleEdges = meetingEdges
    .map((e) => ({
      srcLabel: idToNode.get(e.srcNodeId)?.label,
      dstLabel: idToNode.get(e.dstNodeId)?.label,
      relation: e.relation,
    }))
    .filter((e): e is MemitBundle["edges"][number] => !!e.srcLabel && !!e.dstLabel);

  return {
    schema: MEMIT_BUNDLE_SCHEMA,
    exportedAt,
    meeting: {
      title: meeting.title,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      transcript: meeting.transcript,
      summary: meeting.summary,
    },
    actionItems,
    chunks,
    nodes: bundleNodes,
    edges: bundleEdges,
  };
}

export function serializeBundle(b: MemitBundle): string {
  return JSON.stringify(b);
}

/** Parse + validate a `.memit` file's contents. Throws a friendly error if bad. */
export function parseBundle(text: string): MemitBundle {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error("This isn't a valid mem-it file (could not read JSON).");
  }
  if (!obj || obj.schema !== MEMIT_BUNDLE_SCHEMA) {
    throw new Error("This file isn't a mem-it bundle.");
  }
  if (!obj.meeting || typeof obj.meeting.title !== "string") {
    throw new Error("This mem-it file is missing its meeting.");
  }
  obj.actionItems = Array.isArray(obj.actionItems) ? obj.actionItems : [];
  obj.chunks = Array.isArray(obj.chunks) ? obj.chunks : [];
  obj.nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  obj.edges = Array.isArray(obj.edges) ? obj.edges : [];
  return obj as MemitBundle;
}

/**
 * Merge a received bundle into the local store as a new meeting. Graph nodes
 * merge by normalized label into the recipient's existing brain (same path the
 * extraction pipeline uses), so shared concepts densify rather than duplicate.
 */
export function importBundle(b: MemitBundle): ImportResult {
  const title = b.meeting.title?.trim() ? `${b.meeting.title} (shared)` : "Shared mem";
  const meeting = createMeeting({ title });
  updateMeeting(meeting.id, {
    transcript: b.meeting.transcript ?? null,
    summary: b.meeting.summary ?? null,
    startedAt: b.meeting.startedAt ?? meeting.startedAt,
    endedAt: b.meeting.endedAt ?? null,
    status: "done",
  });

  let actionItems = 0;
  for (const it of b.actionItems) {
    if (!it || typeof it.text !== "string") continue;
    const created = addActionItem(meeting.id, it.text);
    if (it.done) toggleActionItem(created.id, true);
    actionItems++;
  }

  let chunks = 0;
  for (const c of b.chunks) {
    if (!c || typeof c.text !== "string" || !Array.isArray(c.embedding)) continue;
    insertChunk({
      meetingId: meeting.id,
      text: c.text,
      startMs: c.startMs ?? 0,
      embedding: Float32Array.from(c.embedding),
    });
    chunks++;
  }

  const labelToId = new Map<string, string>();
  let nodesAdded = 0;
  let nodesMerged = 0;
  for (const n of b.nodes) {
    if (!n || typeof n.label !== "string") continue;
    const { id, merged } = upsertNodeByLabel({ label: n.label, type: n.type, meetingId: meeting.id });
    labelToId.set(norm(n.label), id);
    if (merged) nodesMerged++;
    else nodesAdded++;
  }

  let edges = 0;
  for (const e of b.edges) {
    if (!e || typeof e.srcLabel !== "string" || typeof e.dstLabel !== "string") continue;
    const srcId = labelToId.get(norm(e.srcLabel));
    const dstId = labelToId.get(norm(e.dstLabel));
    if (srcId && dstId) {
      insertEdge({ srcId, dstId, relation: e.relation, meetingId: meeting.id });
      edges++;
    }
  }

  return { meetingId: meeting.id, chunks, actionItems, nodesAdded, nodesMerged, edges };
}
