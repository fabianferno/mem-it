import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "../qvac/models";
import { withEmbedder } from "../qvac/embed";
import { searchChunks } from "../db/chunks";
import { getMeeting } from "../db/meetings";

export interface Citation {
  meetingId: string;
  meetingTitle: string;
  text: string;
}
export interface AskResult {
  answer: string;
  citations: Citation[];
}

/**
 * Local RAG: embed the question, cosine top-k over stored transcript chunks,
 * then answer with the LLM grounded only in those chunks. Models loaded and
 * unloaded sequentially (embed model, then LLM) — never both at once.
 */
export async function ask(question: string): Promise<AskResult> {
  const hits = await withEmbedder(async (embedOne) => {
    const qv = await embedOne(question);
    return searchChunks(qv, 5);
  });

  if (hits.length === 0) {
    return { answer: "I don't have any recorded meetings to recall from yet.", citations: [] };
  }

  const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.text}`).join("\n");
  const prompt = `Answer the question using ONLY the context from past meetings below. If the context does not contain the answer, say you don't know.
Context:
${context}

Question: ${question}
Answer:`;

  const modelId = await loadModel({
    modelSrc: LLM_MODEL,
    modelType: "llm",
    modelConfig: { ctx_size: 4096 },
  });
  let answer = "";
  try {
    const run = completion({
      modelId,
      history: [{ role: "user", content: prompt }],
      stream: true,
    });
    for await (const tok of run.tokenStream) answer += tok;
  } finally {
    await unloadModel({ modelId });
  }

  const citations: Citation[] = hits.map((h) => {
    const m = getMeeting(h.chunk.meetingId);
    return { meetingId: h.chunk.meetingId, meetingTitle: m?.title ?? "Meeting", text: h.chunk.text };
  });
  return { answer: answer.trim(), citations };
}
