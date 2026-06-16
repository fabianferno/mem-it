// Jest stub for @qvac/sdk — only used to satisfy imports in perfLog.ts
// The buildPerf tests do not call any of these exports.
export const profiler = {
  enable: () => {},
  disable: () => {},
  clear: () => {},
  exportJSON: () => ({ config: {}, aggregates: {}, exportedAt: "0" }),
  exportTable: () => "",
};
export const loadModel = async () => "";
export const unloadModel = async () => {};
export const completion = () => ({});
export const diffusion = () => ({});
export const cancel = async () => {};
export const suspend = async () => {};
export const resume = async () => {};
export const state = async () => "active";
export const SMOLVLM2_500M_MULTIMODAL_Q8_0 = "smolvlm2-500m";
export const MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0 = "mmproj-smolvlm2-500m";
export const SD_V2_1_1B_Q8_0 = "sd-v2-1-1b";
