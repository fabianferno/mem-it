import { useSyncExternalStore } from "react";
import type { Stage } from "../types";
import { runSession } from "./runSession";
import { deleteMeeting } from "../db/meetings";

export interface ProcessingState {
  meetingId: string | null;
  stage: Stage;
  active: boolean;
  reviewReady: boolean;
}

let state: ProcessingState = { meetingId: null, stage: "idle", active: false, reviewReady: false };
let cancelled = false;

const stateListeners = new Set<() => void>();
const graphListeners = new Set<() => void>(); // fired when the graph gains a node/edge

function emitState() {
  state = { ...state };
  stateListeners.forEach((l) => l());
}
function emitGraph() {
  graphListeners.forEach((l) => l());
}

export function getProcessing(): ProcessingState {
  return state;
}
export function subscribeProcessing(fn: () => void): () => void {
  stateListeners.add(fn);
  return () => stateListeners.delete(fn);
}
export function subscribeGraph(fn: () => void): () => void {
  graphListeners.add(fn);
  return () => graphListeners.delete(fn);
}

/** React hook: current processing state. */
export function useProcessing(): ProcessingState {
  return useSyncExternalStore(subscribeProcessing, getProcessing, getProcessing);
}

/**
 * Kick off a session and return immediately. The pipeline runs to completion
 * regardless of which screen is mounted; screens reflect it via the store.
 */
export function startSession(
  meetingId: string,
  wavUri: string,
  onReviewReady?: () => void
): void {
  cancelled = false;
  state = { meetingId, stage: "transcribing", active: true, reviewReady: false };
  emitState();

  runSession({
    meetingId,
    wavUri,
    shouldCancel: () => cancelled,
    onStage: (s) => {
      state.stage = s;
      emitState();
    },
    onReviewReady: () => {
      state.reviewReady = true;
      emitState();
      onReviewReady?.();
    },
    onNode: () => emitGraph(),
    onEdge: () => emitGraph(),
  })
    .catch((err) => {
      // runSession already marked the meeting "error" — surface the cause so
      // failures are diagnosable instead of a silent "tap to retry".
      console.error("[session] pipeline failed:", err?.stack || err?.message || err);
    })
    .finally(() => {
      if (cancelled && state.meetingId) deleteMeeting(state.meetingId);
      state = { meetingId: null, stage: cancelled ? "idle" : state.stage, active: false, reviewReady: false };
      emitState();
      emitGraph();
    });
}

/** Request cancellation; the pipeline aborts at the next stage boundary. */
export function cancelSession(): void {
  cancelled = true;
}

export function isProcessing(): boolean {
  return state.active;
}
