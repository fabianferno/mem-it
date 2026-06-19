# Cortex — local-first Omi on QVAC

A fully on-device, privacy-first second brain. Record a meeting, and Cortex
transcribes it, extracts entities + action items, embeds everything for recall,
and grows a glowing 3D "brain graph" of concepts that connects across sessions.
**No audio, transcript, or derived data ever leaves the phone.** All inference
runs through Tether's `@qvac/sdk`.

Pivot from Obscura — reuses its compiled QVAC worker bundle, iOS native wiring
(bare-kit + Swift 6.2 patches), glass UI kit, and the sequential
load → infer → unload memory discipline.

## Pipeline (all local, one model in memory at a time)

```
record (WAV) → Whisper STT → unload
             → Llama 3.2 1B  → stream {nodes, edges} (live graph) + summary/actions → unload
             → GTE embeddings → node merge + chunk vectors → unload
             → SQLite (meetings, nodes, edges, chunks)
```

- **STT:** `WHISPER_SMALL_Q8_0`
- **LLM:** `LLAMA_3_2_1B_INST_Q4_0` (extraction + summary)
- **Embeddings:** `GTE_LARGE_FP16` (1024-dim)

## Features

- **Meetings** — record manual sessions; each gets a transcript, summary, and action items.
- **Brain** — a 3D force-directed graph (`3d-force-graph`/three.js in a WebView); nodes bloom in live as the LLM streams, and the same concept merges across meetings (brute-force cosine, threshold 0.82).
- **Ask** — local RAG: embed the query, cosine top-k over transcript chunks, answer with citations.

## Run

```bash
# 1. install deps and pin native module versions for SDK 56
npm install
npx expo install expo-audio expo-sqlite react-native-webview
# 2. generate the offline graph bundle (also runs on postinstall)
npm run bundle:graph
# 3. build to a device (QVAC needs real hardware; iPhone 14 Pro target, iOS 16.4+)
npm run ios
```

First launch downloads the QVAC models (Whisper, Llama 3.2 1B, GTE) into the app's
cache, then runs entirely offline.

## Tests

Pure logic (vectors, SQLite layer, streaming JSON parser, entity extraction,
graph merge, pipeline orchestration, RAG) is unit-tested against mocks:

```bash
npm test    # 26 tests, no device needed
```

## Architecture notes

- `src/qvac/` — STT / extract / summarize / embed wrappers, each loads one model and unloads it.
- `src/db/` — `expo-sqlite` store; embeddings as Float32 BLOBs, similarity in JS (`vectors.ts`).
- `src/pipeline/runSession.ts` — sequential orchestrator (the memory-safe core).
- `src/graph3d/` — `graph.html` (3d-force-graph host) + `GraphWebView.tsx` bridge; `graphHtml.ts` is generated.
- `src/rag/ask.ts` — local retrieval-augmented answering.
