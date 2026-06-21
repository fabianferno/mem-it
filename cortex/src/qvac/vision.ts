import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { VISION_MODEL, VISION_MMPROJ } from "./models";
import { timed } from "../perf/perfLog";

/** Strip an expo `file://` URI down to the bare path QVAC's loaders expect. */
function barePath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

/** What the multimodal model is asked to do with a captured photo. */
export const VISION_PROMPT =
  "Look at this image. If it contains any handwritten or printed text, transcribe that text verbatim. " +
  "Then describe what the image shows — the scene, people, place, or objects — in 2-4 sentences. " +
  "Be concise and factual.";

/** Pure: trim and collapse 3+ blank lines to a single blank line. */
export function cleanVisionOutput(raw: string): string {
  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Analyze a captured image with a QVAC multimodal model. Loads the VLM (with its
 * mmproj projector), runs once with the image as an attachment, then unloads —
 * the load → infer → unload discipline. Returns the cleaned description.
 */
export async function analyzeImage(
  uri: string,
  onToken?: (t: string) => void
): Promise<string> {
  return timed(
    { stage: "vision", model: VISION_MODEL.name, modelType: "llm" },
    () =>
      loadModel({
        modelSrc: VISION_MODEL,
        modelType: "llm",
        modelConfig: {
          ctx_size: 4096,
          predict: 512,
          repeat_penalty: 1.1,
          // The multimodal projector that lets the LLM consume image tokens.
          projectionModelSrc: VISION_MMPROJ,
        },
      }),
    async (ctx, modelId) => {
      const run = completion({
        modelId,
        history: [
          {
            role: "user",
            content: VISION_PROMPT,
            attachments: [{ path: barePath(uri) }],
          },
        ],
        stream: true,
      });
      let raw = "";
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        raw += tok;
        onToken?.(tok);
      }
      const final = await run.final;
      const text = final.contentText?.trim() || final.raw?.fullText?.trim() || raw;
      return cleanVisionOutput(text);
    },
    (modelId) => unloadModel({ modelId })
  );
}
