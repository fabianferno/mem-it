# Cortex — Local-First Omi (QVAC) — Design Spec

**Date:** 2026-06-19
**Status:** Approved (pending spec review)
**Working name:** Cortex
**Target device:** iPhone 14 Pro (A16, 6 GB RAM), iOS 16.4+

## 1. Summary

Cortex is a fully on-device, privacy-first second brain for the QVAC hackathon. It
records meeting/conversation sessions, transcribes them locally, extracts entities and
action items with a local LLM, embeds everything for local RAG, and grows a glowing 3D
"brain graph" of concepts that connects across sessions. **No audio, transcript, or
derived data ever leaves the phone.** All inference runs through Tether's `@qvac/sdk`.

It is a pivot from the existing **Obscura** app (camera → VLM caption → diffusion
stylize). Obscura already ships the hard parts we reuse: the compiled QVAC worker
bundle, the iOS native wiring (bare-kit + Swift 6.2 fixes), the sequential
load→infer→unload memory discipline, and a glass UI kit.

## 2. Goals / Non-goals

### Goals (MVP)
- Record a session (manual Start/Stop) and persist it.
- On Stop: transcribe → extract `{concepts, people, tasks, relationships}` + summary +
  action items → embed → merge into the brain graph.
- **Hero moment:** glowing nodes bloom into a 3D force-directed graph in real time as the
  LLM streams its JSON ("thought to action").
- Per-session detail: transcript, summary, action items.
- RAG: ask a question → embed query → top-k cosine over stored chunks → LLM answers with
  session citations.
- Everything 100% local.

### Non-goals (MVP)
- True always-on background capture (iOS-restricted; needs a real BLE pendant). We use
  manual foreground sessions.
- BLE pendant hardware integration.
- Cloud sync, multi-device, accounts.
- MCP/Notion/Asana automations (Omi has these; out of scope for the hackathon MVP, noted
  as a future hook).
- Native graph rendering (we use a WebView; see §6).

## 3. Reuse from Obscura

New Expo app at `wack/cortex/`. Obscura stays untouched as a reference. Copy:

| Asset | From | Use |
|---|---|---|
| QVAC worker bundle | `obscura/qvac/` (`worker.bundle.js`, `worker.entry.mjs`, `addons.manifest.json`) | Already compiled with `whispercpp`, `parakeet`, `llamacpp-completion`, `llamacpp-embedding` plugins — exactly our stack. No rebuild needed. |
| iOS native config | `obscura/ios/`, `app.json`, `patches/`, `expo-build-properties` (deploymentTarget 16.4, Swift 6.2 patches) | Boots bare-kit + QVAC on device. |
| QVAC lifecycle | `obscura/src/qvac/client.ts` (`installLifecycle`, `cancelModel`) | App suspend/resume + cancel safety. |
| UI kit | `obscura/src/ui/*` (`GlassCard`, `CircleButton`, `Glow`, `Pill`, `DisplayHeading`), `theme.ts` | Consistent dark glass aesthetic. |
| Patterns | `perf/perfLog.ts`, `qvac/errors.ts`, stage-indicator pattern, file-backed index idea | Perf logging, typed errors, pipeline UX. |

The worker bundle already declares the plugins we need (verified in
`obscura/qvac/worker.entry.mjs`): `whisperPlugin`, `parakeetPlugin`, `llmPlugin`,
`embeddingsPlugin`. So we do **not** re-run `bundleSdk`.

## 4. QVAC API (grounded in docs.qvac.tether.io/llms-full.txt)

### 4.1 Transcription (STT) — Whisper
```ts
import { loadModel, transcribe, unloadModel, WHISPER_SMALL_Q8_0 } from "@qvac/sdk";

const id = await loadModel({
  modelSrc: WHISPER_SMALL_Q8_0,
  modelType: "whisper",
  modelConfig: {
    audio_format: "f32le",   // see §7 audio-format risk
    language: "en",
    strategy: "greedy",
    n_threads: 4,
    vad_params: { threshold: 0.35, min_silence_duration_ms: 150, max_speech_duration_s: 30.0 },
  },
  onProgress: (p) => onProgress("transcribing", p.percentage),
});
const text = await transcribe({ modelId: id, audioChunk: wavPath });
await unloadModel({ modelId: id });
```
- **Model:** `WHISPER_SMALL_Q8_0`. One model, no fallbacks.

### 4.2 LLM extraction + summary — completion (streaming)
```ts
import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from "@qvac/sdk";

const id = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0, modelType: "llm", modelConfig: { ctx_size: 4096 } });
const run = completion({ modelId: id, history: [{ role: "user", content: EXTRACTION_PROMPT(transcript) }], stream: true });
for await (const tok of run.tokenStream) { /* incremental JSON parse → optimistic graph nodes */ }
await unloadModel({ modelId: id });
```
- **Model:** `LLAMA_3_2_1B_INST_Q4_0`. One model for the whole app (~0.8 GB, proven SDK
  headline model, reliable JSON). No alternatives.
- Two completions per session: (1) entity/relationship JSON (streamed for live graph),
  (2) summary + action items. Two calls keep each prompt clear and the streamed JSON small
  and parseable.

### 4.3 Embeddings — embed
```ts
import { loadModel, embed, unloadModel, GTE_LARGE_FP16 } from "@qvac/sdk";

const id = await loadModel({ modelSrc: GTE_LARGE_FP16, modelType: "embeddings" });
const { embedding } = await embed({ modelId: id, text }); // Float32[1024]
await unloadModel({ modelId: id });
```
- 1024-dim vectors. Used for (a) node dedup/merge across sessions, (b) RAG over transcript
  chunks.

### 4.4 Memory discipline
Exactly one model loaded at a time. Pipeline runs **sequentially**: Whisper →
unload → LLM → unload → embeddings → unload. This is the proven Obscura pattern that keeps
the app under the iOS jetsam limit on 6 GB devices.

## 5. Data model — `expo-sqlite`

Deliberate decision: **do not use `sqlite-vss`/native vector extensions** (painful to build
on Expo iOS, and QVAC's own SQLite-vector helpers run inside the bare worker, not in RN).
Store embeddings as Float32 BLOBs and do **brute-force cosine similarity in JS**. At
hackathon scale (hundreds–low-thousands of chunks/nodes) this is fast and dependency-free.
Graduating to an ANN index later is a non-breaking change.

```sql
meetings(     id TEXT PK, title TEXT, started_at INT, ended_at INT, audio_uri TEXT,
              transcript TEXT, summary TEXT, status TEXT )   -- status: recording|processing|done|error
action_items( id TEXT PK, meeting_id TEXT, text TEXT, done INT DEFAULT 0 )
nodes(        id TEXT PK, label TEXT, type TEXT, embedding BLOB, mention_count INT,
              first_meeting_id TEXT, created_at INT )         -- type: person|concept|task|tech|value|source
edges(        id TEXT PK, src_node_id TEXT, dst_node_id TEXT, relation TEXT, weight INT,
              meeting_id TEXT )
chunks(       id TEXT PK, meeting_id TEXT, text TEXT, start_ms INT, embedding BLOB )
```

Node merge rule: a newly extracted entity whose embedding has cosine > `MERGE_THRESHOLD`
(start 0.82, tune on device) against an existing node of the same `type` merges into it
(increment `mention_count`, brighten node) instead of creating a duplicate. This is what
makes the graph *grow and densify* across meetings rather than fragment.

## 6. Modules & boundaries

Each module has one purpose, a small interface, and is independently testable.

```
cortex/src/
  qvac/
    lifecycle.ts        # copied from Obscura client.ts
    stt.ts              # transcribeSession(wavPath, onProgress) -> string
    extract.ts          # extractEntities(transcript, onEntity) -> {nodes,edges}; streams
    summarize.ts        # summarize(transcript) -> {summary, actionItems[]}
    embed.ts            # embedText(text) -> Float32Array; embedMany(texts)
    models.ts           # the three model constants in one place
  db/
    schema.ts           # table DDL + migrations
    meetings.ts         # CRUD for meetings + action_items
    graph.ts            # nodes/edges insert + cosine merge + getGraph()
    vectors.ts          # blobToF32 / f32ToBlob / cosine / topK
  audio/
    recorder.ts         # start()/stop() -> wav file uri  (expo-audio)
  pipeline/
    runSession.ts       # orchestrates stt->extract->summarize->embed->persist, sequential
    stages.ts           # Stage type + StageIndicator wiring
  rag/
    ask.ts              # ask(question) -> {answer, citations[]}: embed q -> topK chunks -> completion
  graph3d/
    graph.html          # 3d-force-graph (three.js + UnrealBloom) host page
    GraphWebView.tsx    # RN <-> WebView bridge (postMessage): addNode/addEdge/setGraph/focusNode
  ui/                   # copied glass kit + theme
  screens/
    MeetingsScreen.tsx  # list of session cards
    RecordScreen.tsx    # Start/Stop, timer, live stage indicator
    MeetingDetailScreen.tsx  # transcript / summary / action items
    BrainScreen.tsx     # full-screen 3D graph; tap node -> mentions + linked meetings
    AskScreen.tsx       # RAG chat
  navigation/AppNavigator.tsx
```

### 6.1 3D graph (the hero)
- `react-native-webview` hosts `graph.html` running `3d-force-graph` (vasturiano), which
  wraps three.js with a force simulation and supports an `UnrealBloomPass` for the glow.
  Library shipped as a local UMD asset bundled with the app (no runtime CDN — keeps it
  offline/private).
- Bridge contract (RN → WebView via `injectJavaScript`/`postMessage`):
  `setGraph({nodes,edges})`, `addNode(node)`, `addEdge(edge)`, `focusNode(id)`.
  WebView → RN (via `onMessage`): `nodeTap(id)`.
- **Decoupling:** the WebView runs its own `requestAnimationFrame` render/physics loop.
  During §4.2 streaming, RN parses partial JSON and posts `addNode`/`addEdge` events
  **optimistically** as each entity is parsed — the graph animates while the LLM is still
  generating, and inference never blocks the render thread.
- Node visual: glowing sphere, brightness/size scaled by `mention_count`; color by `type`.

## 7. Risks & decisions

| Risk | Decision |
|---|---|
| `transcribe` wants a 16 kHz WAV path; `expo-audio` defaults to `.m4a`/`.caf`. | Record directly to **PCM WAV 16 kHz mono** via `expo-audio` recording options if supported; otherwise convert on-device. The QVAC worker bundles `bare-ffmpeg` (its "built-in audio decoder") — confirm whether `transcribe` accepts m4a directly before adding a conversion step. Resolve in plan task 0. |
| Small LLM emits malformed/partial JSON. | Strict, example-driven prompt; a **tolerant streaming JSON parser** that tolerates trailing/incomplete tokens for the live graph, plus a final strict parse on completion. On parse failure, fall back to a non-streamed retry with lower temperature. |
| Memory on 6 GB device with 1024-dim FP16 embeddings + LLM. | Strict sequential load/unload (Obscura-proven). Never hold two models. |
| iOS background mic. | Out of scope — manual foreground sessions only (§2). |
| WebView ↔ RN message volume during streaming. | Batch node/edge adds (coalesce per animation frame / per ~50 ms) to avoid bridge spam. |
| Expo 56 audio module name. | Per `obscura/AGENTS.md`, verify against the v56 versioned docs (`expo-audio` vs `expo-av`) before coding — plan task 0. |

## 8. Screens / UX flow

1. **Meetings** (home): list of session cards (date, summary preview, #action items, node
   count added). FAB → Record.
2. **Record:** big Start; while recording show elapsed timer. Stop → run pipeline with the
   Obscura-style `StageIndicator` (transcribing → extracting → embedding → done); the
   brain graph can be shown live here for the hero demo.
3. **Meeting detail:** tabs/sections — Transcript, Summary, Action items (checkable).
4. **Brain:** full-screen 3D graph of the whole second brain; tap a node → bottom sheet
   with its mentions and the meetings it came from.
5. **Ask:** text input → answer with citations linking to source meetings.

## 9. New dependencies

`expo-sqlite`, `react-native-webview`, `expo-audio` (or `expo-av` — confirm per §7), and a
bundled `3d-force-graph` UMD asset (+ three.js, included by the lib).

## 10. Build order (feeds the implementation plan)

0. **Spike (de-risk):** record a WAV on device → `transcribe` it end-to-end; confirm audio
   format + Expo 56 audio module. This is the only unknown that can sink the timeline.
1. Scaffold `cortex/` from Obscura (copy worker bundle, iOS config, UI kit, lifecycle); app
   boots on device with a smoke `loadModel`.
2. DB layer (`schema`, `meetings`, `vectors`, `graph`) + tests for cosine/merge.
3. Audio recorder + Record screen (Start/Stop → WAV).
4. STT (`stt.ts`) wired into `runSession`; transcript persisted + shown.
5. Extraction (`extract.ts`) streaming + summarize; action items + summary persisted.
6. 3D graph WebView + bridge; **live optimistic node growth** during extraction (hero).
7. Embeddings + node merge across sessions.
8. RAG Ask screen.
9. Polish: glow/bloom tuning, stage UX, error states, perf logging.

The hackathon hero demo (record → live glowing graph growth) is fully delivered by step 6;
7–8 complete the "sovereign second brain" story.
