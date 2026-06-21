# Hardware Specifications — mem-it

mem-it runs entirely on-device. All QVAC inference (Whisper STT, Llama 3.2 1B,
GTE-large embeddings, and Qwen3-VL 2B image analysis) executes on the phone below;
no inference is offloaded.

> Track: **Mobile** (retail smartphone, on-device inference).

## Demo device

| Field | Value |
|---|---|
| Device | Apple iPhone 14 Pro (`iPhone15,2`) |
| SoC | Apple A16 Bionic (arm64e) |
| CPU | 6-core (2 performance "Everest" + 4 efficiency "Sawtooth") |
| GPU | Apple 5-core GPU |
| Neural Engine | 16-core ANE |
| RAM | 6 GB LPDDR5 |
| Storage (total) | <!-- TODO: confirm in Settings → General → iPhone Storage --> |
| Storage (free at demo) | <!-- TODO: confirm in Settings → General → iPhone Storage --> |
| OS | iOS 26.5 (build 23F77) |
| App runtime | Expo SDK 56 / React Native 0.85 / Hermes |
| Build / install | `expo run:ios` (debug), Xcode 26.1.1 |
| QVAC SDK | @qvac/sdk 0.12.2 |

## Models resident (one at a time — sequential load → infer → unload)

| Stage | Model | Quantization | Approx. size on disk |
|---|---|---|---|
| STT | Whisper small | Q8_0 | ~250 MB |
| LLM | Llama 3.2 1B Instruct | Q4_0 | ~770 MB |
| Embeddings | GTE-large | FP16 | ~670 MB |
| Vision¹ | Qwen3-VL 2B Instruct (+ mmproj projector) | Q4_K_M (+ Q8_0) | ~1.5 GB + ~0.9 GB projector (approx.) |

¹ The vision model and its multimodal projector load **only** while analyzing an
attached photo, then unload — the same load → infer → unload discipline. Sizes are
approximate; confirm against the registry build. Camera/photo-library access is
declared in `Info.plist` (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`);
images and their analysis stay on-device.

Peak memory holds exactly one model at a time (never concurrent), which is what
keeps mem-it within the iPhone's 6 GB budget.

## Evidence to attach (capture on device)

The QVAC hackathon requires system-profiler proof. Capture and add to this repo:

- [ ] **System profiler screenshot** — iOS: Settings → General → About (model,
      capacity, iOS version) and/or Xcode → Window → Devices and Simulators
      showing the connected device's model identifier and OS.
- [ ] **Storage screenshot** — Settings → General → iPhone Storage (total/free).
- [x] **Performance log** — captured: [`evidence/memit-perf-1782083338975.json`](./evidence/memit-perf-1782083338975.json),
      a real on-device run (Whisper STT → Llama 3.2 1B → GTE embeddings; TTFT
      ~1.0 s, ~44 tok/s, ~33.9 s total). Pulled via `devicectl`; see
      [`evidence/README.md`](./evidence/README.md).

Suggested layout:

```
evidence/
  about-screen.png
  storage.png
  xcode-device.png
  memit-perf-<timestamp>.json
```

## How the performance log is produced

`src/perf/perfLog.ts` records a `ModelRun` for every model lifecycle (load /
infer / unload), capturing load ms, inference ms, unload ms, TTFT, tokens/sec,
and prompt size. `runSession` calls `resetPerf()` at the start of a recording
and `writePerfLog()` when it completes, emitting a structured JSON file to the
app document directory. Retrieve it via Xcode → Devices → mem-it → Download
Container, or share it from the app, and place it under `evidence/`.
