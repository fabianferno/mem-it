# Evidence — mem-it on-device performance / audit log

This folder holds the structured audit log the QVAC hackathon asks for: a real
on-device run capturing model loads/unloads, TTFT, and tokens/sec.

## `memit-perf-1782083338975.json`

A single **standard recording run** captured on the demo device and pulled
straight off the phone with `xcrun devicectl` (unedited). Schema `memit.perf.v1`,
written by `cortex/src/perf/perfLog.ts` (`writePerfLog`) at the end of
`runSession`.

- **Device:** Apple iPhone 14 Pro (`iPhone15,2`), A16, 6 GB RAM, iOS 26.5
  (build 23F77). See [`../HARDWARE.md`](../HARDWARE.md). *(The JSON's `device`/`os`
  fields are `null` because the app calls `writePerfLog()` without metadata; the
  device is documented here and in HARDWARE.md.)*
- **Captured:** 2026-06-21 (run `exportedAt` 2026-06-21T23:08:58Z).
- **Pipeline:** record (WAV) → Whisper STT → Llama 3.2 1B (summary + action items,
  then graph extraction) → GTE-large embeddings. One model resident at a time
  (load → infer → unload).

### Headline metrics from this run

| Stage | Model | load (ms) | infer (ms) | unload (ms) | TTFT (ms) | output | tok/s |
|---|---|--:|--:|--:|--:|--:|--:|
| transcribe | Whisper small Q8_0 | 2316 | 15872 | 6 | — | — | — |
| summarize | Llama 3.2 1B Q4_0 | 3270 | 3553 | 68 | 1023 | 112 | 44.27 |
| extract | Llama 3.2 1B Q4_0 | 3363 | 2135 | 35 | 1024 | 48 | 43.20 |
| embed | GTE-large FP16 | 2825 | 419 | 13 | — | 3 | 7.16 |

Total wall time across model lifecycles: **~33.9 s**. The QVAC profiler export
(`qvacProfiler`) is included alongside our per-stage metrics for cross-checking.

### Notes / honest caveats

- `outputTokens` is counted from streamed token-chunks, not tokenizer-verified
  tokens; `promptChars` is an input-size proxy (the SDK exposes no public
  tokenizer). Both are labeled in the JSON `legend`.
- This run covers the recording pipeline. The image-analysis (Qwen3-VL) stage is
  not in this file — it runs outside `runSession`, so its metrics are not flushed
  to a perf log yet.

### How to capture another

1. Record + fully process a meeting on the device (wait for all stages to finish).
2. The app writes `memit-perf-<epoch>.json` to its Documents directory and logs
   `[perf] wrote performance log: <uri>`.
3. Pull it: `xcrun devicectl device copy from --device <udid> --domain-type
   appDataContainer --domain-identifier io.memit.app --source
   Documents/memit-perf-<epoch>.json --destination evidence/` (or Xcode →
   Devices & Simulators → mem-it → Download Container).
