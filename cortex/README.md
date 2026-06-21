# mem-it — local-first Omi on QVAC

A fully on-device, privacy-first second brain. Record a meeting, and mem-it
transcribes it, extracts entities + action items, embeds everything for recall,
and grows a glowing 3D "brain graph" of concepts that connects across sessions.
**No audio, transcript, or derived data ever leaves the phone.** All inference
runs through Tether's `@qvac/sdk`.

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
- **Recall (on-device agent)** — a minimal tool-calling loop: the LLM routes each question to a tool (`search_memory` over transcripts, or `list_todos` over the action-items table), then answers grounded in that result, **streaming token-by-token** with citations. The chosen tool is shown in the UI.
- **Prompt-injection hardened** — transcripts and retrieved context are untrusted (a participant can say "ignore your instructions…"). All such text is fenced as data with an instruction hierarchy and forged markers are stripped, so injected commands are never obeyed (`src/qvac/safety.ts`).
- **Performance log** — every model lifecycle (load/infer/unload, TTFT, tokens/sec) is recorded and written to a structured JSON after each run (`src/perf/perfLog.ts`).
- **AirDrop a memory (P2P, offline)** — export a meeting as a portable `.memit` bundle (transcript, summary, action items, chunk embeddings, and its graph subgraph) and AirDrop it to another iPhone. The recipient imports it and the shared concepts merge into *their* brain graph + RAG index by label — device-to-device second-brain sharing with no cloud (`src/share/`).

## Run

```bash
# 1. install deps and pin native module versions for SDK 56
npm install
npx expo install expo-audio expo-sqlite react-native-webview expo-sharing expo-document-picker
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
npm test    # 40 tests, no device needed
```

## Performance (iPhone 14 Pro, A16, 6 GB)

Captured from a standard demo run (`memit-perf-*.json`, written to the app
document directory). Fill from a real device run before submission — see
`../HARDWARE.md`.

| Stage | Model | Load (ms) | TTFT (ms) | Tokens/s | Infer (ms) | Unload (ms) |
|---|---|---|---|---|---|---|
| transcribe | Whisper small Q8_0 | _tbd_ | — | — | _tbd_ | _tbd_ |
| summarize | Llama 3.2 1B Q4_0 | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| extract | Llama 3.2 1B Q4_0 | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| embed | GTE-large FP16 | _tbd_ | — | _tbd_ (vec/s) | _tbd_ | _tbd_ |
| rag-route | Llama 3.2 1B Q4_0 | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| rag-answer | Llama 3.2 1B Q4_0 | _tbd_ | _tbd_ | _tbd_ | _tbd_ | _tbd_ |

Peak memory holds exactly one model at a time (never concurrent), which keeps
the pipeline within the phone's RAM budget.

## Architecture notes

- `src/qvac/` — STT / extract / summarize / embed wrappers, each loads one model and unloads it.
- `src/db/` — `expo-sqlite` store; embeddings as Float32 BLOBs, similarity in JS (`vectors.ts`).
- `src/pipeline/runSession.ts` — sequential orchestrator (the memory-safe core).
- `src/graph3d/` — `graph.html` (3d-force-graph host) + `GraphWebView.tsx` bridge; `graphHtml.ts` is generated.
- `src/rag/ask.ts` — Recall agent: tool routing → tool execution → grounded, streamed answer.
- `src/qvac/safety.ts` — prompt-injection defense (data fencing + instruction hierarchy).
- `src/perf/perfLog.ts` — per-model metrics capture + structured perf-log export.
- `src/share/` — `.memit` bundle serialize/parse/import-merge (`bundle.ts`) + AirDrop export / file import (`shareBundle.ts`).
