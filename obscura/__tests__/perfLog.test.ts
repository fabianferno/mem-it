import { buildPerf, Timings } from "../src/perf/perfLog";

test("buildPerf computes per-stage durations and total from timestamps", () => {
  const t: Timings = {
    vlmLoadStart: 1000, vlmLoadEnd: 3000,
    captionStart: 3000, captionEnd: 4000,
    diffusionLoadStart: 5000, diffusionLoadEnd: 9000,
    stylizeStart: 9000, stylizeEnd: 15000,
    pipelineStart: 1000, pipelineEnd: 15500,
  };
  const perf = buildPerf(t);
  expect(perf.vlmLoadMs).toBe(2000);
  expect(perf.captionGenMs).toBe(1000);
  expect(perf.diffusionLoadMs).toBe(4000);
  expect(perf.stylizeGenMs).toBe(6000);
  expect(perf.totalMs).toBe(14500);
});

test("missing endpoints yield 0 for that stage, never NaN", () => {
  const perf = buildPerf({ pipelineStart: 0, pipelineEnd: 100 } as Timings);
  expect(perf.vlmLoadMs).toBe(0);
  expect(Number.isNaN(perf.captionGenMs)).toBe(false);
  expect(perf.totalMs).toBe(100);
});
