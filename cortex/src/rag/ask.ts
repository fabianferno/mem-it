import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "../qvac/models";
import { withEmbedder } from "../qvac/embed";
import { timed } from "../perf/perfLog";
import { INSTRUCTION_HIERARCHY, wrapUntrusted } from "../qvac/safety";
import { searchChunks } from "../db/chunks";
import { getMeeting, listAllActionItems } from "../db/meetings";

export interface Citation {
  meetingId: string;
  meetingTitle: string;
  text: string;
}

/** The tools the Recall agent can orchestrate over. */
export type ToolName = "search_memory" | "list_todos";

export interface AskResult {
  answer: string;
  citations: Citation[];
  /** Which tool the model chose — surfaced in the UI so the orchestration is visible. */
  usedTool: ToolName;
}

export interface ToolCall {
  tool: ToolName;
  query?: string;
}

const ROUTER_PROMPT = (question: string) =>
  `You route a personal meeting assistant to ONE tool. Output ONLY JSON, no prose.
Tools:
- {"tool":"list_todos"} — for questions about tasks, action items, to-dos, follow-ups, or "what do I need to do".
- {"tool":"search_memory","query":"<search terms>"} — for anything about what was discussed in past meetings.
Question: ${question}
JSON:`;

/**
 * Parse the router model's output into a tool call. Tolerant of surrounding
 * prose / fences; defaults to memory search (the safe general path) so a weak
 * 1B model never dead-ends. Pure — unit tested.
 */
export function parseToolCall(raw: string, fallbackQuery: string): ToolCall {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(raw.slice(start, end + 1));
      if (obj?.tool === "list_todos") return { tool: "list_todos" };
      if (obj?.tool === "search_memory") {
        const q =
          typeof obj.query === "string" && obj.query.trim() ? obj.query.trim() : fallbackQuery;
        return { tool: "search_memory", query: q };
      }
    } catch {
      // fall through to default
    }
  }
  return { tool: "search_memory", query: fallbackQuery };
}

/** Streamed-token callback for live UI updates. */
export type OnToken = (token: string) => void;

/** One LLM completion (load → stream → unload), timed for the perf log. */
async function completeOnce(prompt: string, stage: string, onToken?: OnToken): Promise<string> {
  return timed(
    { stage, model: LLM_MODEL.name, modelType: "llm", promptChars: prompt.length },
    () => loadModel({ modelSrc: LLM_MODEL, modelType: "llm", modelConfig: { ctx_size: 4096 } }),
    async (ctx, modelId) => {
      let out = "";
      const run = completion({
        modelId,
        history: [{ role: "user", content: prompt }],
        stream: true,
      });
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        out += tok;
        onToken?.(tok);
      }
      return out;
    },
    (modelId) => unloadModel({ modelId })
  );
}

/**
 * Local Recall agent. Step 1: the model picks a tool (orchestration). Step 2:
 * the tool runs on-device. Step 3: the model answers grounded in the tool's
 * result, streaming tokens via `onToken`. Models load and unload sequentially —
 * never two at once.
 */
export async function ask(question: string, onToken?: OnToken): Promise<AskResult> {
  const routerOut = await completeOnce(ROUTER_PROMPT(question), "rag-route");
  const call = parseToolCall(routerOut, question);

  if (call.tool === "list_todos") return answerFromTodos(question, onToken);
  return answerFromMemory(question, call.query ?? question, onToken);
}

/** Tool: answer over the structured action-items table (cross-table recall). */
async function answerFromTodos(question: string, onToken?: OnToken): Promise<AskResult> {
  const todos = listAllActionItems();
  if (todos.length === 0) {
    return {
      answer: "You have no action items captured yet.",
      citations: [],
      usedTool: "list_todos",
    };
  }
  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);
  const lines = [
    "Open:",
    ...open.map((t) => `- ${t.text} (${t.meetingTitle})`),
    "Completed:",
    ...done.map((t) => `- ${t.text} (${t.meetingTitle})`),
  ].join("\n");

  const prompt = `${INSTRUCTION_HIERARCHY}

Answer the user's question using ONLY this list of their action items.
Action items:
${wrapUntrusted(lines)}

Question: ${question}
Answer:`;
  const answer = (await completeOnce(prompt, "rag-answer", onToken)).trim();
  const citations: Citation[] = open.slice(0, 5).map((t) => ({
    meetingId: t.meetingId,
    meetingTitle: t.meetingTitle,
    text: t.text,
  }));
  return { answer, citations, usedTool: "list_todos" };
}

/** Tool: embed the query, cosine top-k over transcript chunks, answer grounded. */
async function answerFromMemory(
  question: string,
  query: string,
  onToken?: OnToken
): Promise<AskResult> {
  const hits = await withEmbedder(async (embedOne) => {
    const qv = await embedOne(query);
    return searchChunks(qv, 5);
  }, "rag-embed");

  if (hits.length === 0) {
    return {
      answer: "I don't have any recorded mems to recall from yet.",
      citations: [],
      usedTool: "search_memory",
    };
  }

  const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.text}`).join("\n");
  const prompt = `${INSTRUCTION_HIERARCHY}

Answer the question using ONLY the context from past meetings below. If the context does not contain the answer, say you don't know.
Context:
${wrapUntrusted(context)}

Question: ${question}
Answer:`;
  const answer = (await completeOnce(prompt, "rag-answer", onToken)).trim();

  const citations: Citation[] = hits.map((h) => {
    const m = getMeeting(h.chunk.meetingId);
    return { meetingId: h.chunk.meetingId, meetingTitle: m?.title ?? "Meeting", text: h.chunk.text };
  });
  return { answer, citations, usedTool: "search_memory" };
}
