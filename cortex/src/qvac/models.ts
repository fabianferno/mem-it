import { WHISPER_SMALL_Q8_0, LLAMA_3_2_1B_INST_Q4_0, GTE_LARGE_FP16 } from "@qvac/sdk";

// The only three models Cortex uses. One per pipeline stage, no alternatives.
export const STT_MODEL = WHISPER_SMALL_Q8_0;
export const LLM_MODEL = LLAMA_3_2_1B_INST_Q4_0;
export const EMBED_MODEL = GTE_LARGE_FP16;
