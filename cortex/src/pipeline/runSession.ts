import type { Stage, NodeType } from "../types";
import { transcribeSession } from "../qvac/stt";
import { extractEntities } from "../qvac/extract";
import { summarize } from "../qvac/summarize";
import { withEmbedder } from "../qvac/embed";
import { updateMeeting, addActionItem } from "../db/meetings";
import { upsertNodeByLabel, insertEdge } from "../db/graph";
import { insertChunk } from "../db/chunks";

export interface PersistedNode {
  id: string;
  label: string;
  type: NodeType;
  mentionCount: number;
}
export interface PersistedEdge {
  srcId: string;
  dstId: string;
  relation: string;
}

export interface RunSessionOpts {
  meetingId: string;
  wavUri: string;
  onStage: (s: Stage) => void;
  /** Fired once transcript + summary + action items are persisted — safe to
   *  show the meeting to the user while the graph/embeddings finish. */
  onReviewReady?: () => void;
  onNode?: (n: PersistedNode) => void;
  onEdge?: (e: PersistedEdge) => void;
  /** Polled between stages; return true to abort early. */
  shouldCancel?: () => boolean;
}

class Cancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

/** Split a transcript into ~`size`-char windows on whitespace boundaries. */
export function chunkText(text: string, size = 700, max = 12): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + w.length + 1 > size && cur) {
      chunks.push(cur);
      cur = "";
    }
    cur = cur ? cur + " " + w : w;
  }
  if (cur) chunks.push(cur);
  return chunks.slice(0, max);
}

/**
 * Session pipeline, reordered so the user gets the transcript + summary fast
 * (onReviewReady) and the slow graph/embedding work runs after. Still strictly
 * sequential — one QVAC model in memory at a time. Graph nodes/edges persist
 * during extraction (label merge, no embedding) so the Brain fills immediately;
 * the embedding stage only vectorizes transcript chunks for RAG.
 */
export async function runSession(opts: RunSessionOpts): Promise<void> {
  const { meetingId, wavUri, onStage, onReviewReady, onNode, onEdge, shouldCancel } = opts;
  const ck = () => {
    if (shouldCancel?.()) throw new Cancelled();
  };

  try {
    updateMeeting(meetingId, { status: "processing", audioUri: wavUri });

    // 1. Transcribe (Whisper)
    onStage("transcribing");
    const transcript = await transcribeSession(wavUri);
    updateMeeting(meetingId, { transcript, endedAt: Date.now() });
    ck();

    // 2. Summarize + action items (LLM) — this is the "review" content
    onStage("summarizing");
    const { summary, actionItems } = await summarize(transcript);
    updateMeeting(meetingId, { summary });
    for (const t of actionItems) addActionItem(meetingId, t);
    onReviewReady?.(); // user can leave the record screen now
    ck();

    // 3. Extract knowledge graph (LLM). Persist by label as it streams so the
    //    Brain populates live, independent of embeddings.
    onStage("extracting");
    const labelToId = new Map<string, string>();
    const norm = (s: string) => s.trim().toLowerCase();
    const { edges } = await extractEntities(transcript, (n) => {
      const { id } = upsertNodeByLabel({ label: n.label, type: n.type, meetingId });
      labelToId.set(norm(n.label), id);
      onNode?.({ id, label: n.label, type: n.type, mentionCount: 1 });
    });
    for (const e of edges) {
      const srcId = labelToId.get(norm(e.src));
      const dstId = labelToId.get(norm(e.dst));
      if (srcId && dstId) {
        insertEdge({ srcId, dstId, relation: e.relation, meetingId });
        onEdge?.({ srcId, dstId, relation: e.relation });
      }
    }
    ck();

    // 4. Embed transcript chunks for RAG (GTE) — the only embedding work now.
    onStage("embedding");
    await withEmbedder(async (embedOne) => {
      for (const text of chunkText(transcript)) {
        if (shouldCancel?.()) break;
        const v = await embedOne(text);
        insertChunk({ meetingId, text, startMs: 0, embedding: v });
      }
    });

    updateMeeting(meetingId, { status: "done" });
    onStage("done");
  } catch (err) {
    if (err instanceof Cancelled) {
      onStage("idle");
      return; // caller decides whether to delete the meeting
    }
    updateMeeting(meetingId, { status: "error" });
    onStage("error");
    throw err;
  }
}
