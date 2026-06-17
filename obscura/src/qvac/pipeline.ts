import {
  loadModel, completion, diffusion, unloadModel, cancel,
  SMOLVLM2_500M_MULTIMODAL_Q8_0, MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0,
  SD_V2_1_1B_Q8_0,
} from "@qvac/sdk";
import type { Stage, StylePreset, PipelineResult } from "../types";
import { buildPrompt } from "./presets";
import { buildPerf, Timings } from "../perf/perfLog";
import { readPhotoBytes, writeStylizedPng } from "../media/photoBytes";

export type ProgressFn = (stage: Stage, percent: number) => void;

export type PipelineHandle = {
  promise: Promise<PipelineResult>;
  cancel: () => Promise<void>;
};

export function runPipeline(opts: {
  photoUri: string;
  preset: StylePreset;
  onStage: (stage: Stage) => void;
  onProgress: ProgressFn;
}): PipelineHandle {
  const { photoUri, preset, onStage, onProgress } = opts;
  let cancelled = false;
  let activeCompletionRequestId: string | undefined;
  let diffusionModelId: string | undefined;
  const t: Partial<Timings> = {};

  async function doCancel(): Promise<void> {
    cancelled = true;
    if (activeCompletionRequestId) {
      try { await cancel({ requestId: activeCompletionRequestId }); } catch {}
    }
    if (diffusionModelId) {
      try { await cancel({ modelId: diffusionModelId, kind: "diffusion" }); } catch {}
    }
  }

  const promise = (async (): Promise<PipelineResult> => {
    t.pipelineStart = Date.now();

    // Guard: verify the captured photo file exists before starting inference
    const info = await (await import("expo-file-system/legacy")).getInfoAsync(photoUri);
    if (!info.exists) {
      const e = new Error("Photo missing") as Error & { code: number };
      e.code = 52413; // IMAGE_FILE_NOT_FOUND
      throw e;
    }

    // ---- Stage 1: VLM load + caption ----
    onStage("loading-vlm");
    t.vlmLoadStart = Date.now();
    const vlmId = await loadModel({
      modelSrc: SMOLVLM2_500M_MULTIMODAL_Q8_0,
      modelType: "llm",
      modelConfig: { ctx_size: 1024, projectionModelSrc: MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0 },
      onProgress: (p) => onProgress("loading-vlm", p.percentage),
    });
    t.vlmLoadEnd = Date.now();
    if (cancelled) { await unloadModel({ modelId: vlmId }); throw cancelError(); }

    onStage("captioning");
    t.captionStart = Date.now();
    const run = completion({
      modelId: vlmId,
      history: [{
        role: "user",
        content: "Describe this photo in one vivid sentence: subjects, setting, lighting, mood. No preamble.",
        attachments: [{ path: photoUri }],
      }],
      stream: true,
    });
    activeCompletionRequestId = run.requestId;
    let caption = "";
    for await (const tok of run.tokenStream) {
      caption += tok;
      onProgress("captioning", Math.min(95, caption.length)); // coarse; token stream has no % — show motion
    }
    caption = caption.trim();
    t.captionEnd = Date.now();
    activeCompletionRequestId = undefined;

    onStage("unloading-vlm");
    await unloadModel({ modelId: vlmId });
    if (cancelled) throw cancelError();

    // ---- Stage 2: diffusion load + stylize ----
    onStage("loading-diffusion");
    t.diffusionLoadStart = Date.now();
    const sdId = await loadModel({
      modelSrc: SD_V2_1_1B_Q8_0,
      modelType: "diffusion",
      onProgress: (p) => onProgress("loading-diffusion", p.percentage),
    });
    diffusionModelId = sdId;
    t.diffusionLoadEnd = Date.now();
    if (cancelled) { await unloadModel({ modelId: sdId }); throw cancelError(); }

    onStage("stylizing");
    t.stylizeStart = Date.now();
    const initImage = await readPhotoBytes(photoUri);
    const dz = diffusion({
      modelId: sdId,
      prompt: buildPrompt(preset, caption),
      negative_prompt: preset.negativePrompt,
      init_image: initImage,
      strength: preset.strength,
      steps: preset.steps,
      cfg_scale: preset.cfgScale,
      seed: -1,
    });
    for await (const { step, totalSteps } of dz.progressStream) {
      onProgress("stylizing", Math.round((step / totalSteps) * 100));
    }
    const [png] = await dz.outputs;
    t.stylizeEnd = Date.now();

    onStage("unloading-diffusion");
    await unloadModel({ modelId: sdId });
    diffusionModelId = undefined;

    const id = `${t.pipelineStart}`;
    const stylizedUri = await writeStylizedPng(png, id);
    t.pipelineEnd = Date.now();

    onStage("done");
    return {
      id,
      originalUri: photoUri,
      stylizedUri,
      presetId: preset.id,
      caption,
      createdAt: t.pipelineStart!,
      perf: buildPerf(t as Timings),
    };
  })();

  return { promise, cancel: doCancel };
}

function cancelError(): Error {
  const e = new Error("Cancelled") as Error & { code: number };
  e.code = 52419; // INFERENCE_CANCELLED
  return e;
}
