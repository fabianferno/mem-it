import {
  WHISPER_SMALL_Q8_0,
  LLAMA_3_2_1B_INST_Q4_0,
  GTE_LARGE_FP16,
  QWEN3VL_2B_MULTIMODAL_Q4_K,
  MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K,
} from "@qvac/sdk";

// The models mem-it uses. One per pipeline stage, no alternatives.
export const STT_MODEL = WHISPER_SMALL_Q8_0;
export const LLM_MODEL = LLAMA_3_2_1B_INST_Q4_0;
export const EMBED_MODEL = GTE_LARGE_FP16;
// Multimodal: describes a captured photo (notes, places, people, objects).
// Loaded only while analyzing an attachment; unloaded immediately after.
export const VISION_MODEL = QWEN3VL_2B_MULTIMODAL_Q4_K;
export const VISION_MMPROJ = MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K;
