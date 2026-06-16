import type { Stage } from "../types";

export type PipelineEvent = "advance" | "needs-download" | "error" | "cancel" | "reset";

export const TERMINAL_STAGES: Stage[] = ["done", "error", "cancelled"];

const ADVANCE_ORDER: Stage[] = [
  "idle",
  "capturing",
  "loading-vlm",
  "captioning",
  "unloading-vlm",
  "loading-diffusion",
  "stylizing",
  "unloading-diffusion",
  "done",
];

export function isTerminal(stage: Stage): boolean {
  return TERMINAL_STAGES.includes(stage);
}

export function nextStage(current: Stage, event: PipelineEvent): Stage {
  if (isTerminal(current)) {
    return event === "reset" ? "idle" : current;
  }
  switch (event) {
    case "error":
      return "error";
    case "cancel":
      return "cancelled";
    case "needs-download":
      return current === "capturing" ? "downloading-models" : current;
    case "reset":
      return "idle";
    case "advance": {
      if (current === "downloading-models") return "loading-vlm";
      const i = ADVANCE_ORDER.indexOf(current);
      return i >= 0 && i < ADVANCE_ORDER.length - 1 ? ADVANCE_ORDER[i + 1] : current;
    }
    default:
      return current;
  }
}
