import { loadModel, embed, unloadModel } from "@qvac/sdk";
import { EMBED_MODEL } from "./models";

/**
 * Embed one string into a 1024-dim Float32 vector. Loads GTE, runs, unloads.
 * For batches, prefer `withEmbedder` to amortize the load across many texts.
 */
export async function embedText(text: string): Promise<Float32Array> {
  return withEmbedder((e) => e(text));
}

/**
 * Load the embedding model once, run `fn` (which may embed many texts), then
 * unload. Keeps memory discipline while avoiding reload-per-text cost.
 */
export async function withEmbedder<T>(
  fn: (embedOne: (text: string) => Promise<Float32Array>) => Promise<T>
): Promise<T> {
  const modelId = await loadModel({ modelSrc: EMBED_MODEL, modelType: "embeddings" });
  try {
    const embedOne = async (text: string) => {
      const { embedding } = await embed({ modelId, text });
      return Float32Array.from(embedding as number[]);
    };
    return await fn(embedOne);
  } finally {
    await unloadModel({ modelId });
  }
}
