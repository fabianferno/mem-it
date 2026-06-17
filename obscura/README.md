# Obscura — On-Device AI Darkroom Camera

> Take a photo → on-device VLM caption → on-device image-to-image diffusion in a chosen style. 100% on-device via `@qvac/sdk`. No cloud inference.

**Hackathon track: Mobile**

---

## What it does

Obscura turns your iPhone into a film darkroom. You shoot a photo; a small vision-language model reads it and writes a caption; a Stable Diffusion model rewrites the image in a chosen artistic style. Every step runs on the device — no data leaves your phone, no server is called.

**Hard constraint:** all inference goes through `@qvac/sdk` (QVAC) running inside a Bare worker bundle on iOS. There is no cloud fallback. A physical iPhone is required — the simulator cannot run llama.cpp or diffusion weights.

---

## Pipeline

The pipeline is strictly sequential. Both models are never in memory at the same time:

```
load VLM → caption photo → unload VLM → load Stable Diffusion → img2img stylize → unload SD → done
```

**Models used:**
- `SMOLVLM2_500M_MULTIMODAL_Q8_0` + `MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0` (~0.6 GB total) — SmolVLM2-500M for captioning
- `SD_V2_1_1B_Q8_0` (~2.2 GB) — Stable Diffusion 2.1 for img2img stylization

---

## Run instructions (clean checkout)

**Requirements:** macOS with Xcode, a physical iPhone (iOS 16+), Node 20+.

```bash
git clone <repo> && cd obscura
npm install
npx expo prebuild --clean
npx expo run:ios --device   # physical iPhone REQUIRED — no simulator (llama.cpp / diffusion need real hardware)
```

**First run:** the app will show a download screen and pull ~2.8 GB of model weights (SmolVLM2-500M + mmproj ≈ 0.6 GB, Stable Diffusion 2.1 ≈ 2.2 GB). Wi-Fi is strongly recommended. Models are cached on device after the first download — subsequent launches skip straight to the camera.

---

## Unit tests

Pure-logic modules (presets, error normalization, state machine, perf aggregation, theme) are covered by Jest and run without a device:

```bash
npm test
```

Tested modules: `src/qvac/presets.ts`, `src/qvac/errors.ts`, `src/qvac/stateMachine.ts`, `src/perf/perfLog.ts`, `src/theme.ts`.

Camera, on-device inference, and UI cannot run in Jest or the simulator — those are verified via `npx expo run:ios --device`.

---

## Dev notes

### Node tuning harness

`scripts/pipeline-smoke.mjs` is a CLI harness for tuning diffusion `strength`/`steps` before wiring on-device. Drop a photo at `scripts/test-photo.jpg` and run:

```bash
node scripts/pipeline-smoke.mjs <photo-path> <strength> <steps>
# e.g. node scripts/pipeline-smoke.mjs scripts/test-photo.jpg 0.45 20
```

**Note:** if `@qvac/sdk` diffusion requires the Bare runtime and cannot run under plain Node, skip this harness and tune via the on-device smoke screen instead (the harness still captures the VLM captioning pass in that case).

### Performance log

The app enables `profiler` from `@qvac/sdk` on startup and calls `profiler.exportJSON()` after each completed pipeline run, writing the result to the device's document directory via `expo-file-system`.

A sample log is committed at `perf/sample-run.json`.

**TODO:** `perf/sample-run.json` does not exist yet — it must be captured from a real device run. Once the physical-iPhone build passes and a full pipeline run completes, retrieve the exported JSON (via the share sheet or a temporary export button) and commit it here.

---

## Tech stack

- Expo SDK 56 / React Native 0.85 / TypeScript
- `@qvac/sdk@^0.12.2` — all on-device inference (VLM + diffusion)
- `react-native-bare-kit@^0.14.0` — Bare worker runtime
- `expo-camera`, `expo-file-system`, `expo-media-library`, `expo-sharing`, `expo-haptics`, `expo-network`
- `expo-blur`, `expo-linear-gradient` — darkroom glassmorphism UI
- Jest + ts-jest — pure-logic unit tests

---

## Status

Code is complete and typechecks (`npx tsc --noEmit`). Unit tests pass (`npm test`).

**Remaining step:** on-device verification — physical-iPhone build, camera permission, model download, full pipeline run (load VLM → caption → unload → load SD → stylize → unload), save/share result, cancel mid-run without crash, confirm second run skips the download screen. This has not yet been completed; the app has not been verified on a device.

---

## License

MIT — see [LICENSE](./LICENSE).
