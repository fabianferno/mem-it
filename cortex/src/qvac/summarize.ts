import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "./models";
import { timed } from "../perf/perfLog";
import { wrapUntrusted } from "./safety";

export interface SummaryResult {
  summary: string;
  actionItems: string[];
}

/** Cap the transcript fed to the LLM so prompt + generation stays within ctx. */
export const MAX_TRANSCRIPT_CHARS = 14000;

const PROMPT = (transcript: string) =>
  `Transcript:
${wrapUntrusted(transcript.slice(0, MAX_TRANSCRIPT_CHARS))}

Summarize the meeting in 2-3 sentences and extract ALL action items — every task or
commitment someone agreed to do, including implicit ones ("I'll…", "I can…", "we
should…", "let's…"). Each as a short imperative.
Reply with ONLY JSON (empty array only if there are truly no tasks):
{"summary":"...","actionItems":["...","..."]}`;

/** Pure parser: tolerate ```json fences and surrounding prose. */
export function parseSummary(raw: string): SummaryResult {
  const fenced = raw.replace(/```json/gi, "").replace(/```/g, "");
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return { summary: "", actionItems: [] };
  try {
    const obj = JSON.parse(fenced.slice(start, end + 1));
    return {
      summary: typeof obj.summary === "string" ? obj.summary : "",
      actionItems: Array.isArray(obj.actionItems)
        ? obj.actionItems.filter((x: unknown) => typeof x === "string")
        : [],
    };
  } catch {
    return { summary: "", actionItems: [] };
  }
}

/**
 * JSON schema that constrains the model's output to exactly the shape we parse.
 * llama.cpp converts this to a GBNF grammar and applies it during decoding, so
 * the 1B model is forced to emit valid JSON rather than free-form prose.
 */
const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    actionItems: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "actionItems"],
  additionalProperties: false,
} as const;

/** Run the LLM to produce a summary + action items. Loads LLM, runs, unloads. */
export async function summarize(transcript: string): Promise<SummaryResult> {
  const prompt = PROMPT(transcript);
  console.log(`[summarize] prompt ${prompt.length} chars (~${Math.round(prompt.length / 4)} tokens)`);
  return timed(
    { stage: "summarize", model: LLM_MODEL.name, modelType: "llm", promptChars: prompt.length },
    () =>
      loadModel({
        modelSrc: LLM_MODEL,
        modelType: "llm",
        // predict caps generation so a degenerate repetition loop can't grow the
        // output until it overflows the context; repeat_penalty discourages loops.
        modelConfig: { ctx_size: 4096, predict: 640, repeat_penalty: 1.1 },
      }),
    async (ctx, modelId) => {
      const run = completion({
        modelId,
        history: [{ role: "user", content: prompt }],
        stream: true,
        responseFormat: {
          type: "json_schema",
          json_schema: { name: "meeting_summary", schema: SUMMARY_SCHEMA },
        },
      });
      let raw = "";
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        raw += tok;
      }
      // Prefer the SDK's canonical aggregated text (think-blocks stripped);
      // fall back to the streamed tokens if the addon didn't surface it.
      const final = await run.final;
      const text = final.contentText?.trim() || final.raw?.fullText?.trim() || raw;
      const result = parseSummary(text);
      console.log(
        `[summarize] summary=${result.summary.length}chars actionItems=${result.actionItems.length}; raw(${text.length}): ${text.slice(0, 400)}`
      );
      return result;
    },
    (modelId) => unloadModel({ modelId })
  );
}
