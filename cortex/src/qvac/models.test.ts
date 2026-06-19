import { STT_MODEL, LLM_MODEL, EMBED_MODEL } from "./models";

test("model constants resolve to the three chosen QVAC models", () => {
  expect(STT_MODEL).toBe("WHISPER_SMALL_Q8_0");
  expect(LLM_MODEL).toBe("LLAMA_3_2_1B_INST_Q4_0");
  expect(EMBED_MODEL).toBe("GTE_LARGE_FP16");
});
