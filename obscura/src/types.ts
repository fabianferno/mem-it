export type Stage =
  | "idle"
  | "capturing"
  | "downloading-models"
  | "loading-vlm"
  | "captioning"
  | "unloading-vlm"
  | "loading-diffusion"
  | "stylizing"
  | "unloading-diffusion"
  | "done"
  | "error"
  | "cancelled";

export type StylePreset = {
  id: string;
  label: string;
  promptTemplate: string; // must contain literal "{caption}"
  negativePrompt: string;
  strength: number; // 0..1
  steps: number;
  cfgScale: number;
};

export type PipelinePerf = {
  vlmLoadMs: number;
  captionGenMs: number;
  diffusionLoadMs: number;
  stylizeGenMs: number;
  totalMs: number;
};

export type PipelineResult = {
  id: string;
  originalUri: string;
  stylizedUri: string;
  presetId: string;
  caption: string;
  createdAt: number;
  perf: PipelinePerf;
};
