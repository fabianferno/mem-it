// Jest mock for @qvac/sdk. Pure logic (parsers, vectors, db) is tested against
// this; native inference is never exercised in unit tests.

// Model constants
export const WHISPER_SMALL_Q8_0 = "WHISPER_SMALL_Q8_0";
export const WHISPER_BASE_Q8_0 = "WHISPER_BASE_Q8_0";
export const LLAMA_3_2_1B_INST_Q4_0 = "LLAMA_3_2_1B_INST_Q4_0";
export const GTE_LARGE_FP16 = "GTE_LARGE_FP16";
export const QWEN3VL_2B_MULTIMODAL_Q4_K = "QWEN3VL_2B_MULTIMODAL_Q4_K";
export const MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K = "MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K";

// Profiler (used by perfLog.ts)
export const profiler = {
  enable: () => {},
  disable: () => {},
  clear: () => {},
  exportJSON: () => ({ config: {}, aggregates: {}, exportedAt: "0" }),
  exportTable: () => "",
};

// Model lifecycle / inference
export const loadModel = jest.fn(async () => "model-1");
export const unloadModel = jest.fn(async () => {});
export const transcribe = jest.fn(async () => "mock transcript");
export const embed = jest.fn(async () => ({ embedding: new Array(1024).fill(0) }));
export const completion = jest.fn(() => ({
  requestId: "r1",
  tokenStream: (async function* () {
    yield "[]";
  })(),
  final: Promise.resolve({
    contentText: "[]",
    toolCalls: [],
    raw: { fullText: "[]" },
  }),
}));
export const cancel = jest.fn(async () => {});
export const suspend = jest.fn(async () => {});
export const resume = jest.fn(async () => {});
export const state = jest.fn(async () => "active");
