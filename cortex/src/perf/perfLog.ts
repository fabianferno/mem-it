import { profiler } from "@qvac/sdk";
import * as FileSystem from "expo-file-system/legacy";

export type QvacModelType = "whisper" | "llm" | "embeddings";

/**
 * One QVAC model lifecycle — load → infer → unload — with inference metrics.
 * This is the structured perf record the hackathon asks for (model loads/unloads,
 * TTFT, tokens/sec) captured for a real on-device run.
 */
export interface ModelRun {
  /** pipeline stage: transcribe | summarize | extract | embed | rag-embed | rag-answer */
  stage: string;
  /** model id / constant (e.g. WHISPER_SMALL_Q8_0) */
  model: string;
  modelType: QvacModelType;
  /** epoch ms when the load began */
  startedAt: number;
  /** model load → ready (ms) */
  loadMs: number;
  /** inference wall time (ms): first infer call → last token/result */
  inferMs: number;
  /** model unload time (ms) */
  unloadMs: number;
  /** time to first token (ms) — LLM streaming only */
  ttftMs: number | null;
  /** streamed token-chunks generated (LLM) / vectors produced (embeddings) */
  outputTokens: number | null;
  /** LLM: generated tokens/sec excl. TTFT; embeddings: vectors/sec */
  tokensPerSec: number | null;
  /** input size proxy — the SDK exposes no public tokenizer */
  promptChars: number | null;
}

let runs: ModelRun[] = [];

/** Clear recorded runs — call at the start of a standard demo run. */
export function resetPerf(): void {
  runs = [];
}

export function recordModelRun(r: ModelRun): void {
  runs.push(r);
}

export function getPerfRuns(): ModelRun[] {
  return runs.slice();
}

export function enableProfiler(): void {
  profiler.enable({ mode: "verbose" });
}

export interface TimedMeta {
  stage: string;
  model: string;
  modelType: QvacModelType;
  promptChars?: number;
}

export interface TimedCtx {
  /** Mark the moment the first token arrives (for TTFT). */
  markFirstToken: () => void;
  /** Count output units produced (tokens for LLM, vectors for embeddings). */
  addTokens: (n: number) => void;
  /** Accumulate input size when it is only known mid-inference (batch embeds). */
  addPromptChars: (n: number) => void;
}

/**
 * Time a single QVAC model lifecycle and record a {@link ModelRun}. Keeps the
 * load → infer → unload discipline intact while capturing load/infer/unload
 * latencies, TTFT, and throughput without cluttering each wrapper.
 */
export async function timed<T>(
  meta: TimedMeta,
  load: () => Promise<string>,
  infer: (ctx: TimedCtx, modelId: string) => Promise<T>,
  unload: (modelId: string) => Promise<void>
): Promise<T> {
  const startedAt = Date.now();
  const modelId = await load();
  const loadMs = Date.now() - startedAt;

  let ttftMs: number | null = null;
  let outputTokens = 0;
  let promptChars: number | null = meta.promptChars ?? null;
  const inferStart = Date.now();
  const ctx: TimedCtx = {
    markFirstToken: () => {
      if (ttftMs === null) ttftMs = Date.now() - inferStart;
    },
    addTokens: (n) => {
      outputTokens += n;
    },
    addPromptChars: (n) => {
      promptChars = (promptChars ?? 0) + n;
    },
  };

  let inferMs = 0;
  try {
    const out = await infer(ctx, modelId);
    inferMs = Date.now() - inferStart;
    return out;
  } finally {
    const unloadStart = Date.now();
    await unload(modelId);
    const unloadMs = Date.now() - unloadStart;
    if (inferMs === 0) inferMs = Date.now() - inferStart; // error path
    const genMs = ttftMs != null ? Math.max(0, inferMs - ttftMs) : inferMs;
    recordModelRun({
      stage: meta.stage,
      model: meta.model,
      modelType: meta.modelType,
      startedAt,
      loadMs,
      inferMs,
      unloadMs,
      ttftMs,
      outputTokens: outputTokens || null,
      tokensPerSec:
        outputTokens > 0 && genMs > 0 ? +(outputTokens / (genMs / 1000)).toFixed(2) : null,
      promptChars,
    });
  }
}

export interface PerfLogMeta {
  device?: string;
  os?: string;
  note?: string;
}

/**
 * Write a structured JSON perf log of all recorded runs to the app document
 * directory and return its URI. Includes the QVAC profiler export alongside our
 * per-stage metrics so judges can cross-check.
 */
export async function writePerfLog(meta: PerfLogMeta = {}): Promise<string> {
  const recorded = getPerfRuns();
  const qvacProfiler = profiler.exportJSON({ includeRecentEvents: true });
  const totalMs = recorded.reduce((a, r) => a + r.loadMs + r.inferMs + r.unloadMs, 0);

  const payload = {
    schema: "memit.perf.v1",
    exportedAt: new Date().toISOString(),
    device: meta.device ?? null,
    os: meta.os ?? null,
    note: meta.note ?? null,
    legend: {
      loadMs: "model load → ready (ms)",
      inferMs: "inference wall time (ms)",
      unloadMs: "model unload time (ms)",
      ttftMs: "time to first token, LLM only (ms)",
      outputTokens: "streamed token-chunks (LLM) / vectors produced (embeddings)",
      tokensPerSec: "LLM: generated tokens/sec excl. TTFT; embeddings: vectors/sec",
      promptChars: "input character count (SDK exposes no public tokenizer)",
    },
    summary: {
      runs: recorded.length,
      totalMs,
      models: [...new Set(recorded.map((r) => r.model))],
    },
    runs: recorded,
    qvacProfiler,
  };

  const uri = `${FileSystem.documentDirectory}memit-perf-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  return uri;
}
