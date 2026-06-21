# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**mem-it** (package name `mem-it`, dir `cortex/`) — a fully on-device, privacy-first "second brain" for the QVAC Hackathon. Record a meeting; the app transcribes it, extracts a knowledge graph + action items, embeds it for recall, and grows a 3D "brain graph". **No audio, transcript, or derived data leaves the phone** — all inference runs through Tether's `@qvac/sdk`.

## ⚠️ Expo 56 — read the docs first

Expo SDK 56 / React Native 0.85 / React 19 are recent and APIs have changed. **Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing native/Expo code** (especially `expo-audio` recording APIs, which are the main on-device risk — see `spike.md`). Don't rely on memory of older Expo APIs.

## Commands

```bash
npm test                  # 26 Jest tests — pure logic, no device needed. THIS is your fast feedback loop.
npx jest src/path.test.ts # run a single test file
npm run bundle:graph      # regenerate src/graph3d/graphHtml.ts from graph.html (auto-runs on postinstall)
npm run ios               # build to a real device (QVAC needs real hardware: iPhone 14 Pro, iOS 16.4+)
```

There is no lint script. `postinstall` runs `patch-package` (applies `patches/expo-modules-jsi+56.0.10.patch`) then `bundle:graph`.

## Architecture

The core is a **strictly sequential pipeline — exactly one QVAC model resident in memory at a time** (load → infer → unload). This is the project's central constraint; never hold two models loaded concurrently.

**Pipeline** (`src/pipeline/runSession.ts`): `record (WAV) → Whisper STT → Llama 3.2 1B (summary+actions, then graph extraction) → GTE embeddings → SQLite`. Reordered so the user sees transcript+summary fast (`onReviewReady`) while slow graph/embedding work continues. Cancellation is checked at stage boundaries (`shouldCancel`).

- `src/pipeline/sessionRunner.ts` — a global store (`useSyncExternalStore`) driving `runSession` from any screen. `startSession()` fires-and-returns; the pipeline runs regardless of which screen is mounted, and screens reflect progress via `useProcessing()` / `subscribeGraph()`.
- `src/pipeline/stages.ts` — `Stage` labels and ordering for the UI.

**QVAC wrappers** (`src/qvac/`): each wraps one model and owns its load/unload.
- `models.ts` — the only 3 models: `WHISPER_SMALL_Q8_0` (STT), `LLAMA_3_2_1B_INST_Q4_0` (LLM), `GTE_LARGE_FP16` (1024-dim embeddings).
- `stt.ts` / `extract.ts` / `summarize.ts` / `embed.ts` — wrappers. `withEmbedder()` loads GTE once for a batch. `barePath()` in stt strips `file://` for QVAC loaders.
- `jsonStream.ts` — incremental parser that yields graph nodes as the LLM streams a JSON array (drives the live graph).
- `lifecycle.ts` — `installLifecycle()` suspends/resumes QVAC on RN AppState changes; `cancelModel()` kills in-flight inference.
- `errors.ts` — numeric QVAC error codes (verified against `@qvac/sdk@0.12.2`) + `normalizeError`.

**Storage** (`src/db/`): `expo-sqlite` (`memit.db`), opened once via `openDb()` (`sqlite.ts`), schema in `schema.ts` (meetings, action_items, nodes, edges, chunks). **Embeddings are stored as Float32 BLOBs; similarity is computed in JS** (`vectors.ts`) — there is no vector DB. Graph nodes merge across meetings by cosine (threshold 0.82) in `graph.ts`; during extraction nodes persist by normalized label so the graph fills before embeddings exist.

**3D graph** (`src/graph3d/`): `graph.html` hosts `3d-force-graph`/three.js in a `react-native-webview`. `bundle:graph` inlines the vendored UMD (`assets/vendor/3d-force-graph.min.js`) into the HTML and emits `graphHtml.ts` (**auto-generated — never edit by hand**). `GraphWebView.tsx` is the RN↔WebView bridge.

**RAG / Recall agent** (`src/rag/ask.ts`): a minimal tool-calling loop. The LLM first routes to one tool — `search_memory` (embed query → cosine top-k over transcript chunks) or `list_todos` (structured action-items table) — then answers grounded in that tool's result, with citations. Each step loads/unloads sequentially (router LLM → tool → answer LLM); `parseToolCall` is pure and unit-tested. The chosen tool is surfaced in `AskScreen`. All local.

**P2P sharing** (`src/share/`): `bundle.ts` serializes a meeting (transcript, summary, action items, chunk embeddings as `number[]`, and its graph subgraph by **label**) to a `.memit` JSON and merges a received bundle back in via `upsertNodeByLabel` (same label-merge path as extraction, so shared concepts densify the recipient's graph). `shareBundle.ts` is the device-only IO: export via `expo-sharing` (AirDrop sheet), import via `expo-document-picker`. `bundle.ts` is pure/db-only and unit-tested; `shareBundle.ts` is not (native modules).

**UI** (`src/screens/`, `src/ui/`, `src/navigation/`): dark glassmorphism theme (`theme.ts`, red-on-black). `AppNavigator.tsx` is a hand-rolled tab switcher (no React Navigation) with tabs Mems / Act / Memhive / Recall + a record FAB.

**QVAC worker** (`qvac/`): `worker.bundle.js` is a prebuilt ~10MB bundle of QVAC plugins (`worker.entry.mjs` lists them); wired into the native build by the `@qvac/sdk/expo-plugin` (see `app.json`). Treat `worker.bundle.js` as a build artifact.

## Testing

Tests mock the device boundary: `@qvac/sdk`, `expo-sqlite`, and `expo-file-system/legacy` are mapped to `__mocks__/` (see `jest.config.js`). Pure logic (vectors, SQLite layer, streaming JSON parser, extraction, graph merge, pipeline orchestration, RAG) is unit-tested; WebGL, audio, and real inference are device-only and tracked in `spike.md`. Test files live next to source as `*.test.ts`.
