import { loadModel, embed, unloadModel } from "@qvac/sdk";
import { EMBED_MODEL } from "./models";
import { timed } from "../perf/perfLog";

/**
 * Embed one string into a 1024-dim Float32 vector. Loads GTE, runs, unloads.
 * For batches, prefer `withEmbedder` to amortize the load across many texts.
 */
export async function embedText(text: string): Promise<Float32Array> {
  return withEmbedder((e) => e(text));
}

/**
 * Load the embedding model once, run `fn` (which may embed many texts), then
 * unload. Keeps memory discipline while avoiding reload-per-text cost. `stage`
 * tags the recorded perf run (e.g. "embed" for ingest, "rag-embed" for query).
 */
export async function withEmbedder<T>(
  fn: (embedOne: (text: string) => Promise<Float32Array>) => Promise<T>,
  stage = "embed"
): Promise<T> {
  return timed(
    { stage, model: EMBED_MODEL.name, modelType: "embeddings" },
    () => loadModel({ modelSrc: EMBED_MODEL, modelType: "embeddings" }),
    async (ctx, modelId) => {
      const embedOne = async (text: string) => {
        ctx.addPromptChars(text.length);
        const { embedding } = await embed({ modelId, text });
        ctx.addTokens(1);
        return Float32Array.from(embedding as number[]);
      };
      return fn(embedOne);
    },
    (modelId) => unloadModel({ modelId })
  );
}
