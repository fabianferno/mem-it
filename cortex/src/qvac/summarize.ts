import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { LLM_MODEL } from "./models";

export interface SummaryResult {
  summary: string;
  actionItems: string[];
}

const PROMPT = (transcript: string) =>
  `Summarize this meeting transcript. Output ONLY JSON:
{"summary":"<2-3 sentence summary>","actionItems":["<imperative task>", ...]}
No prose, no markdown fences, no trailing text.
Transcript:
<<<
${transcript}
>>>`;

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

/** Run the LLM to produce a summary + action items. Loads LLM, runs, unloads. */
export async function summarize(transcript: string): Promise<SummaryResult> {
  const modelId = await loadModel({
    modelSrc: LLM_MODEL,
    modelType: "llm",
    modelConfig: { ctx_size: 4096 },
  });
  try {
    const run = completion({
      modelId,
      history: [{ role: "user", content: PROMPT(transcript) }],
      stream: true,
    });
    let raw = "";
    for await (const tok of run.tokenStream) raw += tok;
    return parseSummary(raw);
  } finally {
    await unloadModel({ modelId });
  }
}
