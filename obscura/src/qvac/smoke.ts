import {
  loadModel,
  completion,
  unloadModel,
  profiler,
  SMOLVLM2_500M_MULTIMODAL_Q8_0,
  MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0,
} from "@qvac/sdk";

export async function smokeTest(onLog: (line: string) => void): Promise<void> {
  profiler.enable({ mode: "verbose" });
  onLog("loading VLM...");
  const modelId = await loadModel({
    modelSrc: SMOLVLM2_500M_MULTIMODAL_Q8_0,
    modelType: "llm",
    modelConfig: {
      ctx_size: 1024,
      projectionModelSrc: MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0,
    },
    onProgress: (p) => onLog(`download ${Math.round(p.percentage)}%`),
  });
  onLog(`loaded: ${modelId}. running completion...`);
  const run = completion({
    modelId,
    history: [{ role: "user", content: "Say the single word: hello" }],
    stream: true,
  });
  const text = await run.text;
  onLog(`completion: ${text}`);
  await unloadModel({ modelId });
  onLog("unloaded. perf:\n" + profiler.exportTable());
}
