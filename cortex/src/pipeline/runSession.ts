import type { Stage } from "../types";
import type { ExtractedNode, ExtractedEdge } from "../qvac/extract";
import { transcribeSession } from "../qvac/stt";
import { extractEntities } from "../qvac/extract";
import { summarize } from "../qvac/summarize";
import { withEmbedder } from "../qvac/embed";
import { updateMeeting, addActionItem } from "../db/meetings";
import { upsertNode, insertEdge } from "../db/graph";
import { insertChunk } from "../db/chunks";

export interface RunSessionOpts {
  meetingId: string;
  wavUri: string;
  onStage: (s: Stage) => void;
  onNode?: (n: ExtractedNode) => void;
  onEdge?: (e: ExtractedEdge) => void;
}

/** Split a transcript into ~`size`-char windows on whitespace boundaries. */
export function chunkText(text: string, size = 500): string[] {
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
  return chunks;
}

/**
 * Run the full on-device session pipeline, strictly sequential so only one
 * QVAC model is in memory at a time: transcribe -> extract (live graph) ->
 * summarize -> embed + persist graph/chunks. On any failure the meeting is
 * marked "error" and the error is rethrown.
 */
export async function runSession(opts: RunSessionOpts): Promise<void> {
  const { meetingId, wavUri, onStage, onNode, onEdge } = opts;
  try {
    updateMeeting(meetingId, { status: "processing", audioUri: wavUri });

    // 1. Transcribe (Whisper)
    onStage("transcribing");
    const transcript = await transcribeSession(wavUri);
    updateMeeting(meetingId, { transcript, endedAt: Date.now() });

    // 2. Extract knowledge graph (LLM, streamed for live graph)
    onStage("extracting");
    const { nodes, edges } = await extractEntities(transcript, onNode, onEdge);

    // 3. Summarize + action items (LLM)
    onStage("summarizing");
    const { summary, actionItems } = await summarize(transcript);
    updateMeeting(meetingId, { summary });
    for (const t of actionItems) addActionItem(meetingId, t);

    // 4. Embed nodes + chunks, persist graph (GTE). One model load for all.
    onStage("embedding");
    await withEmbedder(async (embedOne) => {
      const labelToId = new Map<string, string>();
      for (const n of nodes) {
        const v = await embedOne(n.label);
        const { id } = upsertNode({ label: n.label, type: n.type, embedding: v, meetingId });
        labelToId.set(n.label, id);
      }
      for (const e of edges) {
        const srcId = labelToId.get(e.src);
        const dstId = labelToId.get(e.dst);
        if (srcId && dstId) insertEdge({ srcId, dstId, relation: e.relation, meetingId });
      }
      for (const text of chunkText(transcript)) {
        const v = await embedOne(text);
        insertChunk({ meetingId, text, startMs: 0, embedding: v });
      }
    });

    updateMeeting(meetingId, { status: "done" });
    onStage("done");
  } catch (err) {
    updateMeeting(meetingId, { status: "error" });
    onStage("error");
    throw err;
  }
}
