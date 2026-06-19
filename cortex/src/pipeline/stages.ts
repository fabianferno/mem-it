import type { Stage } from "../types";

export const STAGE_LABELS: Record<Stage, string> = {
  idle: "Idle",
  transcribing: "Transcribing audio",
  extracting: "Mapping ideas",
  summarizing: "Writing summary",
  embedding: "Memorizing",
  done: "Done",
  error: "Something went wrong",
};

export const PROCESSING_STAGES: Stage[] = [
  "transcribing",
  "extracting",
  "summarizing",
  "embedding",
];
