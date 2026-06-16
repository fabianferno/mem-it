import type { PipelinePerf } from "../types";
import { profiler } from "@qvac/sdk";
import * as FileSystem from "expo-file-system/legacy";

export type Timings = {
  vlmLoadStart?: number; vlmLoadEnd?: number;
  captionStart?: number; captionEnd?: number;
  diffusionLoadStart?: number; diffusionLoadEnd?: number;
  stylizeStart?: number; stylizeEnd?: number;
  pipelineStart: number; pipelineEnd: number;
};

function span(a?: number, b?: number): number {
  if (typeof a !== "number" || typeof b !== "number") return 0;
  return Math.max(0, b - a);
}

export function buildPerf(t: Timings): PipelinePerf {
  return {
    vlmLoadMs: span(t.vlmLoadStart, t.vlmLoadEnd),
    captionGenMs: span(t.captionStart, t.captionEnd),
    diffusionLoadMs: span(t.diffusionLoadStart, t.diffusionLoadEnd),
    stylizeGenMs: span(t.stylizeStart, t.stylizeEnd),
    totalMs: span(t.pipelineStart, t.pipelineEnd),
  };
}

export function enableProfiler(): void {
  profiler.enable({ mode: "verbose" });
}

export async function writePerfLog(perf: PipelinePerf, caption: string): Promise<string> {
  const exported = profiler.exportJSON({ includeRecentEvents: true });
  const payload = { obscuraPerf: perf, caption, profiler: exported };
  const uri = `${FileSystem.documentDirectory}perf-${perf.totalMs}-${exported.exportedAt}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  return uri;
}
