import { loadModel, transcribe, unloadModel } from "@qvac/sdk";
import { STT_MODEL } from "./models";

/** Strip an expo `file://` URI down to the bare path QVAC's loaders expect. */
function barePath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

/**
 * Transcribe a recorded WAV with Whisper. Loads the model, runs once, unloads.
 * Single model in memory for the whole call (the Obscura memory discipline).
 */
export async function transcribeSession(
  wavUri: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const modelId = await loadModel({
    modelSrc: STT_MODEL,
    modelType: "whisper",
    modelConfig: {
      audio_format: "f32le",
      language: "en",
      strategy: "greedy",
      n_threads: 4,
      vad_params: {
        threshold: 0.35,
        min_silence_duration_ms: 150,
        max_speech_duration_s: 30.0,
      },
    },
    onProgress: (p: { percentage: number }) => onProgress?.(p.percentage),
  });
  try {
    const text = await transcribe({ modelId, audioChunk: barePath(wavUri) });
    return (text || "").trim();
  } finally {
    await unloadModel({ modelId });
  }
}
