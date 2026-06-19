# Cortex (Local-First Omi on QVAC) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Cortex — a fully on-device meeting recorder + second-brain (transcribe → extract entities/actions → embed → grow a glowing 3D brain graph → local RAG) using `@qvac/sdk`, reusing Obscura's compiled worker bundle and iOS wiring.

**Architecture:** New Expo app at `wack/cortex/`, scaffolded from Obscura. Manual record sessions produce a WAV; a sequential QVAC pipeline (Whisper → unload → Llama → unload → GTE embed → unload) writes meetings, nodes, edges, and chunks into `expo-sqlite`. A `react-native-webview` hosting `3d-force-graph` renders glowing nodes that bloom in optimistically as the LLM streams extraction JSON. RAG embeds the query and runs brute-force cosine top-k in JS.

**Tech Stack:** Expo ~56, React Native 0.85, `@qvac/sdk` ^0.12.2, `react-native-bare-kit`, `expo-sqlite`, `expo-audio`, `react-native-webview`, `3d-force-graph` (three.js), Jest + ts-jest.

## Global Constraints

- Target device: iPhone 14 Pro, iOS **16.4+** (deploymentTarget already set in Obscura ios config).
- Expo **56** — read versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing Expo API code (per `obscura/AGENTS.md`).
- **Exactly one QVAC model loaded at a time.** Every pipeline stage: `loadModel` → run → `unloadModel` before the next stage. Never hold two.
- Models (the only three, no alternatives): STT `WHISPER_SMALL_Q8_0`, LLM `LLAMA_3_2_1B_INST_Q4_0`, embeddings `GTE_LARGE_FP16` (1024-dim).
- All data stays on device. No network calls for inference or storage. `3d-force-graph`/three.js shipped as a **local bundled asset**, never a runtime CDN.
- Embeddings stored as Float32 **BLOB**; similarity is **brute-force cosine in JS** (no `sqlite-vss`).
- Reuse the QVAC worker bundle from `obscura/qvac/` verbatim — do **not** re-run `bundleSdk`.
- Frequent commits: one per task minimum. Tests via `npm test` (Jest).

---

## File Structure

```
cortex/
  package.json, app.json, index.ts, App.tsx, tsconfig.json, jest.config.js, AGENTS.md
  patches/                      # copied from obscura (expo-modules-jsi Swift 6.2 patch)
  qvac/                         # copied worker bundle (worker.bundle.js, worker.entry.mjs, addons.manifest.json)
  assets/vendor/                # 3d-force-graph.min.js (bundled, offline)
  __mocks__/@qvac/sdk.ts        # jest mock of the SDK
  src/
    theme.ts  ui/*              # copied glass kit (GlassCard, CircleButton, Glow, Pill, DisplayHeading)
    types.ts                    # Meeting, ActionItem, GraphNode, GraphEdge, Chunk, Stage
    qvac/
      lifecycle.ts              # copied client.ts (installLifecycle, cancelModel)
      models.ts                 # the three model constants
      stt.ts                    # transcribeSession(wavPath, onProgress) -> string
      extract.ts                # extractEntities(transcript, onItem) -> {nodes,edges}
      summarize.ts              # summarize(transcript) -> {summary, actionItems}
      embed.ts                  # embedText(text) -> Float32Array
      jsonStream.ts             # tolerant streaming JSON-array parser
    db/
      sqlite.ts                 # openDb() singleton
      schema.ts                 # DDL + migrate()
      vectors.ts                # f32ToBlob/blobToF32/cosine/topK   (PURE, unit-tested)
      meetings.ts               # meeting + action_item CRUD
      graph.ts                  # node/edge insert + cosine merge + getGraph()
      chunks.ts                 # chunk insert + search(queryVec, k)
    audio/recorder.ts           # start()/stop() -> wav uri
    pipeline/
      stages.ts                 # Stage type + labels
      runSession.ts             # orchestrates the sequential pipeline
    rag/ask.ts                  # ask(question) -> {answer, citations}
    graph3d/
      graph.html                # 3d-force-graph host page
      GraphWebView.tsx          # RN <-> WebView bridge
    screens/
      MeetingsScreen.tsx  RecordScreen.tsx  MeetingDetailScreen.tsx
      BrainScreen.tsx  AskScreen.tsx
    navigation/AppNavigator.tsx
```

---

## Task 0: De-risk spike — record WAV → transcribe end-to-end

**Why first:** the only unknown that can sink the timeline is whether `expo-audio` can produce audio that QVAC `transcribe` reads. Resolve before building anything else.

**Files:**
- Create: `cortex/` (scaffold), `cortex/spike.md` (findings)

- [ ] **Step 1:** Scaffold the app by copying Obscura and clearing feature code.

```bash
cd /Users/fabianferno/Documents/wack
cp -R obscura cortex
cd cortex
rm -rf .expo node_modules ios/build src/camera src/darkroom src/result src/download src/gallery src/settings src/media src/perf/__* __tests__/* 2>/dev/null
# keep: qvac/, ios/, patches/, src/ui, src/theme.ts, src/qvac/client.ts, app.json, jest.config.js
```

- [ ] **Step 2:** Read https://docs.expo.dev/versions/v56.0.0/ index and confirm the audio module name (`expo-audio` vs `expo-av`) and its recording options (output format, sample rate, channels). Write the answer into `cortex/spike.md`.

- [ ] **Step 3:** Set `cortex/package.json` name to `cortex`, add deps: `expo-audio` (confirmed name), `expo-sqlite`, `react-native-webview`. Run `npm install`.

- [ ] **Step 4:** Update `cortex/app.json` — change `name`, `slug`, iOS `bundleIdentifier` to `cortex`/`com.cortex.app`; add the **microphone usage description** (`NSMicrophoneUsageDescription`) and keep the existing expo-build-properties / bare-kit config.

- [ ] **Step 5:** Write a temporary spike screen in `App.tsx`: a "Record 5s" button that records via `expo-audio` to a WAV (16 kHz mono PCM if the recording options allow it), then calls a minimal inline `loadModel(WHISPER_SMALL_Q8_0, "whisper")` + `transcribe({ modelId, audioChunk: <path-without-file://> })` + `unloadModel`, and renders the transcript.

- [ ] **Step 6:** Run on device: `npm run ios` (or via the existing Obscura device flow). Speak, confirm a transcript comes back.

- [ ] **Step 7:** Record findings in `cortex/spike.md`: exact recording options that worked, the audio file extension/format, whether a path needs `decodeURIComponent(uri.replace(/^file:\/\//,""))` (as Obscura does for attachments), and whether any ffmpeg conversion was needed. **These findings are inputs to Task 4 and Task 6.**

- [ ] **Step 8:** Commit.

```bash
git add cortex && git commit -m "spike: cortex scaffold + record->transcribe proven on device"
```

**Gate:** Do not proceed until a real transcript returns on device. If `expo-audio` cannot emit a Whisper-readable file, the spike must establish the conversion step (bare-ffmpeg in worker, or an on-device transcode) before Task 4.

---

## Task 1: Project config, types, SDK mock, test harness

**Files:**
- Create: `cortex/src/types.ts`, `cortex/__mocks__/@qvac/sdk.ts`, `cortex/src/qvac/models.ts`
- Modify: `cortex/jest.config.js`, `cortex/package.json`
- Keep: `cortex/src/qvac/lifecycle.ts` (rename of copied `client.ts`)

**Interfaces:**
- Produces: `types.ts` exports `Stage`, `Meeting`, `ActionItem`, `GraphNode`, `GraphEdge`, `Chunk`. `models.ts` exports `STT_MODEL`, `LLM_MODEL`, `EMBED_MODEL`.

- [ ] **Step 1:** Create `src/types.ts`:

```ts
export type Stage =
  | "idle" | "transcribing" | "extracting" | "summarizing" | "embedding" | "done" | "error";

export type NodeType = "person" | "concept" | "task" | "tech" | "value" | "source";

export interface Meeting {
  id: string; title: string; startedAt: number; endedAt: number | null;
  audioUri: string | null; transcript: string | null; summary: string | null;
  status: "recording" | "processing" | "done" | "error";
}
export interface ActionItem { id: string; meetingId: string; text: string; done: boolean; }
export interface GraphNode { id: string; label: string; type: NodeType; mentionCount: number; firstMeetingId: string; createdAt: number; }
export interface GraphEdge { id: string; srcNodeId: string; dstNodeId: string; relation: string; weight: number; meetingId: string; }
export interface Chunk { id: string; meetingId: string; text: string; startMs: number; }
```

- [ ] **Step 2:** Create `src/qvac/models.ts`:

```ts
import { WHISPER_SMALL_Q8_0, LLAMA_3_2_1B_INST_Q4_0, GTE_LARGE_FP16 } from "@qvac/sdk";
export const STT_MODEL = WHISPER_SMALL_Q8_0;
export const LLM_MODEL = LLAMA_3_2_1B_INST_Q4_0;
export const EMBED_MODEL = GTE_LARGE_FP16;
```

- [ ] **Step 3:** Create `__mocks__/@qvac/sdk.ts` so pure logic can be tested without native:

```ts
export const WHISPER_SMALL_Q8_0 = "WHISPER_SMALL_Q8_0";
export const LLAMA_3_2_1B_INST_Q4_0 = "LLAMA_3_2_1B_INST_Q4_0";
export const GTE_LARGE_FP16 = "GTE_LARGE_FP16";
export const loadModel = jest.fn(async () => "model-1");
export const unloadModel = jest.fn(async () => {});
export const transcribe = jest.fn(async () => "mock transcript");
export const embed = jest.fn(async () => ({ embedding: new Array(1024).fill(0) }));
export const completion = jest.fn(() => ({ requestId: "r1", tokenStream: (async function* () { yield "{}"; })() }));
export const cancel = jest.fn(async () => {});
export const suspend = jest.fn(async () => {});
export const resume = jest.fn(async () => {});
export const state = jest.fn(async () => "ready");
```

- [ ] **Step 4:** Ensure `jest.config.js` uses ts-jest and picks up `__mocks__`. Add a trivial `src/qvac/models.test.ts`:

```ts
import { STT_MODEL, LLM_MODEL, EMBED_MODEL } from "./models";
test("model constants resolve", () => {
  expect(STT_MODEL).toBe("WHISPER_SMALL_Q8_0");
  expect(LLM_MODEL).toBe("LLAMA_3_2_1B_INST_Q4_0");
  expect(EMBED_MODEL).toBe("GTE_LARGE_FP16");
});
```

- [ ] **Step 5:** Run `npm test` — expect PASS. Commit.

```bash
git add -A && git commit -m "feat: cortex types, model constants, SDK jest mock"
```

---

## Task 2: Vector math (`vectors.ts`) — pure, fully unit-tested

**Files:**
- Create: `cortex/src/db/vectors.ts`, `cortex/src/db/vectors.test.ts`

**Interfaces:**
- Produces: `f32ToBlob(v: Float32Array): Uint8Array`, `blobToF32(b: Uint8Array): Float32Array`, `cosine(a: Float32Array, b: Float32Array): number`, `topK(query: Float32Array, items: {id:string; vec: Float32Array}[], k: number): {id:string; score:number}[]`.

- [ ] **Step 1: Write the failing test** `src/db/vectors.test.ts`:

```ts
import { f32ToBlob, blobToF32, cosine, topK } from "./vectors";

test("blob round-trips a float32 vector", () => {
  const v = new Float32Array([0.1, -0.2, 0.3, 1, 0]);
  const back = blobToF32(f32ToBlob(v));
  expect(Array.from(back)).toEqual(Array.from(v));
});

test("cosine: identical vectors = 1, orthogonal = 0", () => {
  const a = new Float32Array([1, 0, 0]);
  const b = new Float32Array([0, 1, 0]);
  expect(cosine(a, a)).toBeCloseTo(1, 6);
  expect(cosine(a, b)).toBeCloseTo(0, 6);
});

test("topK returns the k most similar, sorted desc", () => {
  const q = new Float32Array([1, 0]);
  const items = [
    { id: "x", vec: new Float32Array([0, 1]) },   // 0
    { id: "y", vec: new Float32Array([1, 0]) },   // 1
    { id: "z", vec: new Float32Array([0.7, 0.7]) }, // ~.707
  ];
  const r = topK(q, items, 2);
  expect(r.map((x) => x.id)).toEqual(["y", "z"]);
  expect(r[0].score).toBeGreaterThan(r[1].score);
});
```

- [ ] **Step 2: Run to verify it fails:** `npm test -- vectors` → FAIL (module not found).

- [ ] **Step 3: Implement** `src/db/vectors.ts`:

```ts
export function f32ToBlob(v: Float32Array): Uint8Array {
  return new Uint8Array(v.buffer, v.byteOffset, v.byteLength).slice();
}
export function blobToF32(b: Uint8Array): Float32Array {
  const copy = b.slice(); // ensure 4-byte aligned, owned buffer
  return new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
}
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
export function topK(query: Float32Array, items: { id: string; vec: Float32Array }[], k: number) {
  return items
    .map((it) => ({ id: it.id, score: cosine(query, it.vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
```

- [ ] **Step 4:** Run `npm test -- vectors` → PASS.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat: vector blob + cosine + topK with tests"`.

---

## Task 3: SQLite schema + meetings CRUD

**Files:**
- Create: `cortex/src/db/sqlite.ts`, `cortex/src/db/schema.ts`, `cortex/src/db/meetings.ts`, `cortex/src/db/meetings.test.ts`
- Test uses a mock of `expo-sqlite` (in-memory map) — create `cortex/__mocks__/expo-sqlite.ts`.

**Interfaces:**
- Produces: `openDb()`, `migrate(db)`, and meetings API: `createMeeting(p)`, `updateMeeting(id, patch)`, `getMeeting(id)`, `listMeetings()`, `addActionItem(meetingId, text)`, `getActionItems(meetingId)`, `toggleActionItem(id, done)`.

- [ ] **Step 1:** Create `__mocks__/expo-sqlite.ts` — a minimal synchronous-ish in-memory shim exposing `openDatabaseSync(name)` returning an object with `execSync(sql)`, `runSync(sql, params)`, `getAllSync(sql, params)`, `getFirstSync(sql, params)` backed by a tiny SQL-subset interpreter OR (simpler) a hand-rolled table store keyed by the queries this app issues. Keep it just rich enough for the CRUD below.

- [ ] **Step 2:** Create `src/db/schema.ts` with the DDL from the spec §5 (`meetings`, `action_items`, `nodes`, `edges`, `chunks`) and a `migrate(db)` that runs `CREATE TABLE IF NOT EXISTS`.

- [ ] **Step 3:** Create `src/db/sqlite.ts`:

```ts
import * as SQLite from "expo-sqlite";
import { migrate } from "./schema";
let _db: SQLite.SQLiteDatabase | null = null;
export function openDb() {
  if (!_db) { _db = SQLite.openDatabaseSync("cortex.db"); migrate(_db); }
  return _db;
}
```

- [ ] **Step 4: Write failing test** `src/db/meetings.test.ts`:

```ts
import { createMeeting, getMeeting, updateMeeting, listMeetings, addActionItem, getActionItems, toggleActionItem } from "./meetings";

test("create + fetch a meeting", () => {
  const m = createMeeting({ title: "Standup" });
  expect(getMeeting(m.id)?.title).toBe("Standup");
  expect(getMeeting(m.id)?.status).toBe("recording");
});
test("update transcript + status", () => {
  const m = createMeeting({ title: "X" });
  updateMeeting(m.id, { transcript: "hello", status: "done" });
  expect(getMeeting(m.id)?.transcript).toBe("hello");
});
test("action items round-trip + toggle", () => {
  const m = createMeeting({ title: "X" });
  const a = addActionItem(m.id, "ship it");
  expect(getActionItems(m.id)[0].text).toBe("ship it");
  toggleActionItem(a.id, true);
  expect(getActionItems(m.id)[0].done).toBe(true);
});
test("listMeetings returns newest first", () => {
  const a = createMeeting({ title: "A" }); const b = createMeeting({ title: "B" });
  const ids = listMeetings().map((m) => m.id);
  expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
});
```

- [ ] **Step 5: Run** `npm test -- meetings` → FAIL.

- [ ] **Step 6: Implement** `src/db/meetings.ts` using `openDb()` and parameterized `runSync`/`getAllSync`. Generate ids with `String(Date.now()) + Math.random().toString(16).slice(2)`. `createMeeting` defaults `startedAt=Date.now()`, `status="recording"`. `listMeetings` orders by `started_at DESC`. Map DB rows (snake_case, 0/1) to the camelCase typed objects.

- [ ] **Step 7: Run** `npm test -- meetings` → PASS. Commit.

```bash
git add -A && git commit -m "feat: sqlite schema + meetings/action-items CRUD with in-memory test shim"
```

---

## Task 4: Audio recorder + Record screen (Start/Stop → WAV)

**Files:**
- Create: `cortex/src/audio/recorder.ts`, `cortex/src/screens/RecordScreen.tsx`
- Depends on Task 0 spike findings (exact recording options).

**Interfaces:**
- Produces: `recorder` with `start(): Promise<void>`, `stop(): Promise<string>` (returns wav file uri), `isRecording(): boolean`.

- [ ] **Step 1:** Implement `src/audio/recorder.ts` using the `expo-audio` API and the **recording options proven in Task 0** (16 kHz mono PCM WAV). Expose `start`/`stop`/`isRecording`. `stop()` returns the file uri.

- [ ] **Step 2:** Implement `src/screens/RecordScreen.tsx`: a big `CircleButton` (reused) toggling start/stop, an elapsed timer (setInterval while recording), and a callback prop `onComplete(wavUri: string)`. Use the glass `theme.ts`. Request mic permission on mount.

- [ ] **Step 3:** Manual device check: record 10s, confirm a `.wav` file exists at the returned uri (log its size). No automated test (device/native I/O).

- [ ] **Step 4:** Commit `git add -A && git commit -m "feat: audio recorder + record screen"`.

---

## Task 5: STT, summarize, embed wrappers (sequential, load/unload)

**Files:**
- Create: `cortex/src/qvac/stt.ts`, `cortex/src/qvac/summarize.ts`, `cortex/src/qvac/embed.ts`
- Create tests: `cortex/src/qvac/summarize.test.ts` (parsing logic only, SDK mocked)

**Interfaces:**
- Produces:
  - `transcribeSession(wavPath: string, onProgress?: (pct:number)=>void): Promise<string>`
  - `summarize(transcript: string): Promise<{ summary: string; actionItems: string[] }>`
  - `embedText(text: string): Promise<Float32Array>`

- [ ] **Step 1:** Implement `src/qvac/stt.ts` — `loadModel({ modelSrc: STT_MODEL, modelType: "whisper", modelConfig: { audio_format: "f32le", language: "en", strategy: "greedy", n_threads: 4, vad_params: { threshold: 0.35, min_silence_duration_ms: 150, max_speech_duration_s: 30 } }, onProgress })`, then `transcribe({ modelId, audioChunk: <bare path> })` (strip `file://` per Task 0), then `unloadModel`. Use the Obscura attachment-path trick: `decodeURIComponent(wavPath.replace(/^file:\/\//, ""))`.

- [ ] **Step 2:** Implement `src/qvac/embed.ts` — `loadModel(EMBED_MODEL, "embeddings")` → `const { embedding } = await embed({ modelId, text })` → `unloadModel` → return `Float32Array.from(embedding)`.

- [ ] **Step 3:** Implement `src/qvac/summarize.ts` — load `LLM_MODEL` (`modelType: "llm"`, `ctx_size: 4096`), run a non-streamed `completion` collecting the full token stream, then parse a JSON object `{ "summary": string, "actionItems": string[] }`. Export the **pure parser** `parseSummary(raw: string)` separately so it is testable. Unload in `finally`.

- [ ] **Step 4: Write failing test** `src/qvac/summarize.test.ts` for `parseSummary`:

```ts
import { parseSummary } from "./summarize";
test("extracts summary + action items from fenced JSON", () => {
  const raw = 'Sure!\n```json\n{"summary":"We discussed QVAC.","actionItems":["email Bob","book room"]}\n```';
  const r = parseSummary(raw);
  expect(r.summary).toBe("We discussed QVAC.");
  expect(r.actionItems).toEqual(["email Bob", "book room"]);
});
test("falls back to empty action items when missing", () => {
  const r = parseSummary('{"summary":"x"}');
  expect(r.summary).toBe("x");
  expect(r.actionItems).toEqual([]);
});
```

- [ ] **Step 5:** `parseSummary` strips ```` ```json ```` fences, finds the first `{`…last `}`, `JSON.parse`, defaults `actionItems` to `[]`. Run `npm test -- summarize` → PASS.

- [ ] **Step 6:** Commit `git add -A && git commit -m "feat: qvac stt/summarize/embed wrappers + summary parser tests"`.

---

## Task 6: Tolerant streaming JSON parser + entity extraction

**Files:**
- Create: `cortex/src/qvac/jsonStream.ts`, `cortex/src/qvac/jsonStream.test.ts`, `cortex/src/qvac/extract.ts`

**Interfaces:**
- Produces:
  - `createArrayItemParser<T>(onItem: (item: T) => void): { push(chunk: string): void; end(): T[] }` — emits each complete object inside a top-level JSON array as it streams in.
  - `extractEntities(transcript, meetingId, onNode, onEdge): Promise<{nodes: ExtractedNode[]; edges: ExtractedEdge[]}>` where `ExtractedNode={label,type}`, `ExtractedEdge={src,dst,relation}`.

- [ ] **Step 1: Write failing test** `src/qvac/jsonStream.test.ts`:

```ts
import { createArrayItemParser } from "./jsonStream";
test("emits objects from a streamed JSON array as they complete", () => {
  const got: any[] = [];
  const p = createArrayItemParser<any>((x) => got.push(x));
  p.push('[{"label":"QVAC",');     // partial — nothing yet
  expect(got).toHaveLength(0);
  p.push('"type":"tech"},{"label":"Privacy","type":"value"}]');
  expect(got).toEqual([
    { label: "QVAC", type: "tech" },
    { label: "Privacy", type: "value" },
  ]);
});
test("handles strings containing braces", () => {
  const got: any[] = [];
  const p = createArrayItemParser<any>((x) => got.push(x));
  p.push('[{"label":"a {b} c","type":"concept"}]');
  expect(got[0].label).toBe("a {b} c");
});
```

- [ ] **Step 2: Run** `npm test -- jsonStream` → FAIL.

- [ ] **Step 3: Implement** `src/qvac/jsonStream.ts` — a depth-tracking scanner over the accumulated buffer: track `inString`/escape, on `{` at array depth start an object, on matching `}` slice the substring and `JSON.parse` it, emit via `onItem`, advance the cursor. Ignore the outer `[`, commas, whitespace. `end()` returns all collected items.

- [ ] **Step 4: Run** `npm test -- jsonStream` → PASS.

- [ ] **Step 5:** Implement `src/qvac/extract.ts`. Prompt the LLM to output **two top-level arrays** is awkward to stream; instead make **one streamed completion that emits a JSON array of items**, each item either a node `{"kind":"node","label":..,"type":..}` or an edge `{"kind":"edge","src":..,"dst":..,"relation":..}`. Feed `run.tokenStream` chunks into `createArrayItemParser`; in its `onItem`, call `onNode`/`onEdge` (for the live graph) and accumulate. Load/unload `LLM_MODEL` around it. The extraction prompt (verbatim, in the file as a `const`):

```
You extract a knowledge graph from a meeting transcript. Output ONLY a JSON array.
Each element is one of:
  {"kind":"node","label":"<short noun phrase>","type":"person|concept|task|tech|value|source"}
  {"kind":"edge","src":"<node label>","dst":"<node label>","relation":"<verb phrase>"}
Rules: 8-20 nodes max. Every edge's src and dst MUST be a node label you also emit.
No prose, no markdown, no trailing text. Start with [ and end with ].
Transcript:
<<<
{transcript}
>>>
```

- [ ] **Step 6:** Commit `git add -A && git commit -m "feat: tolerant streaming JSON parser + entity extraction"`.

---

## Task 7: Graph store (insert + cosine merge across sessions)

**Files:**
- Create: `cortex/src/db/graph.ts`, `cortex/src/db/chunks.ts`, `cortex/src/db/graph.test.ts`

**Interfaces:**
- Produces:
  - `upsertNode(p: {label; type; embedding: Float32Array; meetingId}): { id: string; merged: boolean }` — merges into an existing same-type node when `cosine > MERGE_THRESHOLD` (0.82), incrementing `mention_count`.
  - `insertEdge(p: {srcId; dstId; relation; meetingId})`.
  - `getGraph(): { nodes: GraphNode[]; edges: GraphEdge[] }`.
  - `chunks.ts`: `insertChunk(p)`, `searchChunks(queryVec, k): {chunk: Chunk; score: number}[]`.

- [ ] **Step 1: Write failing test** `src/db/graph.test.ts` (uses the expo-sqlite mock + real `vectors.ts`):

```ts
import { upsertNode, getGraph } from "./graph";
const vec = (x: number) => { const a = new Float32Array(8).fill(0); a[0] = x; a[1] = 1 - x; return a; };

test("near-duplicate same-type node merges and bumps mentionCount", () => {
  const a = upsertNode({ label: "QVAC", type: "tech", embedding: vec(1.0), meetingId: "m1" });
  const b = upsertNode({ label: "Q.V.A.C", type: "tech", embedding: vec(0.99), meetingId: "m2" });
  expect(b.merged).toBe(true);
  expect(b.id).toBe(a.id);
  expect(getGraph().nodes.find((n) => n.id === a.id)!.mentionCount).toBe(2);
});
test("distinct concept does not merge", () => {
  upsertNode({ label: "QVAC", type: "tech", embedding: vec(1.0), meetingId: "m1" });
  const c = upsertNode({ label: "Privacy", type: "value", embedding: vec(0.0), meetingId: "m1" });
  expect(c.merged).toBe(false);
});
```

- [ ] **Step 2: Run** `npm test -- graph` → FAIL.

- [ ] **Step 3: Implement** `src/db/graph.ts`: `upsertNode` loads all nodes of the same `type` (id + embedding blob), runs `cosine` via `vectors.ts`, and if best > `0.82` updates `mention_count` and returns that id with `merged:true`; otherwise inserts a new node (embedding via `f32ToBlob`). `getGraph` reads nodes + edges into typed arrays. Implement `chunks.ts` similarly with `searchChunks` using `topK`.

- [ ] **Step 4: Run** `npm test -- graph` → PASS. Commit.

```bash
git add -A && git commit -m "feat: graph node merge by cosine + chunk vector search"
```

---

## Task 8: Pipeline orchestration (`runSession`)

**Files:**
- Create: `cortex/src/pipeline/stages.ts`, `cortex/src/pipeline/runSession.ts`, `cortex/src/pipeline/runSession.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 3,5,6,7.
- Produces: `runSession(opts: { meetingId; wavUri; onStage: (s: Stage)=>void; onNode: (n)=>void; onEdge: (e)=>void }): Promise<void>` — runs transcribe → persist transcript → extract (streaming onNode/onEdge) → summarize → embed nodes + chunk transcript & embed chunks → persist all → mark meeting `done`. Strictly sequential; each QVAC stage loads/unloads its own model.

- [ ] **Step 1: Write failing test** `src/pipeline/runSession.test.ts` — mock `stt`, `extract`, `summarize`, `embed` modules; assert the **order** of stages emitted and that `updateMeeting` is called with `status:"done"` and a transcript. Assert no two models conceptually overlap by checking each wrapper was called and returned before the next stage's wrapper is invoked (sequence via a shared call-log array).

```ts
jest.mock("../qvac/stt"); jest.mock("../qvac/extract");
jest.mock("../qvac/summarize"); jest.mock("../qvac/embed");
// ...arrange mocks to push to a log; run; expect log order:
// ["stt","extract","summarize","embed"] and stages include transcribing->...->done
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `runSession.ts` calling the wrappers in order, persisting via `meetings.ts`/`graph.ts`/`chunks.ts`. Chunk the transcript into ~500-char windows for `chunks`. Wrap in try/catch → on error set meeting `status:"error"` and emit `onStage("error")`.

- [ ] **Step 4: Run** → PASS. Commit `git add -A && git commit -m "feat: sequential session pipeline orchestrator with tests"`.

---

## Task 9: 3D brain graph WebView + bridge

**Files:**
- Create: `cortex/src/graph3d/graph.html`, `cortex/src/graph3d/GraphWebView.tsx`, `cortex/assets/vendor/3d-force-graph.min.js`

**Interfaces:**
- Consumes: `getGraph()` output; live `onNode`/`onEdge` events from `runSession`.
- Produces: `<GraphWebView nodes edges onNodeTap />` with imperative ref methods `addNode(n)`, `addEdge(e)`, `setGraph({nodes,edges})`, `focusNode(id)`.

- [ ] **Step 1:** Vendor `3d-force-graph` UMD build + three.js into `assets/vendor/3d-force-graph.min.js` (download once, commit the file — offline requirement). Note the source/version in a comment header.

- [ ] **Step 2:** Write `graph.html`: dark background, full-screen `#graph`, load the vendored script via a `<script>` whose contents are injected (or referenced as a bundled asset). Configure `ForceGraph3D()` with `nodeColor` by `type`, node size/`nodeOpacity` by `mentionCount`, and add `UnrealBloomPass` via `.postProcessingComposer()` for the glow. Implement a `window.addEventListener("message", ...)` handler for `setGraph`/`addNode`/`addEdge`/`focusNode`, coalescing adds per animation frame. On node click, `window.ReactNativeWebView.postMessage(JSON.stringify({type:"nodeTap", id}))`.

- [ ] **Step 3:** Write `GraphWebView.tsx`: load `graph.html` via `source={{ html }}` (inline the html string built from the file + vendored JS so it's offline), expose imperative methods that call `webviewRef.injectJavaScript(`window.__cortex.handle(${json})`)`, and parse `onMessage` → `onNodeTap`. Throttle/queue adds while the page is still loading (`onLoadEnd` flushes a pending buffer).

- [ ] **Step 4:** Manual device check: feed 3 nodes + 2 edges, confirm glowing nodes render and a tap fires `onNodeTap`. No unit test (WebView/native).

- [ ] **Step 5:** Commit `git add -A && git commit -m "feat: 3D glowing brain graph webview + RN bridge"`.

---

## Task 10: Screens + navigation (wire it together — the hero flow)

**Files:**
- Create: `cortex/src/screens/MeetingsScreen.tsx`, `MeetingDetailScreen.tsx`, `BrainScreen.tsx`, `AskScreen.tsx`, `cortex/src/navigation/AppNavigator.tsx`, `cortex/src/rag/ask.ts`
- Modify: `cortex/App.tsx` (mount navigator + `installLifecycle`)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: `ask(question: string): Promise<{ answer: string; citations: {meetingId:string; text:string}[] }>`.

- [ ] **Step 1:** `rag/ask.ts`: `embedText(question)` → `searchChunks(vec, 5)` → build a context prompt with the top chunks → non-streamed `completion(LLM_MODEL, ...)` → return `{answer, citations}` (citations = the chunks used, mapped to their meetings). Load/unload embed model then LLM model **sequentially**.

- [ ] **Step 2:** `RecordScreen` (extend Task 4): on `onComplete(wavUri)`, `createMeeting`, then call `runSession` with `onStage`→`StageIndicator`, and `onNode`/`onEdge`→ a `GraphWebView` shown live on this screen (the hero moment: glowing nodes bloom while processing).

- [ ] **Step 3:** `MeetingsScreen`: `listMeetings()` in a FlatList of `GlassCard`s (date, summary preview, #action items); FAB → Record; tap → Detail.

- [ ] **Step 4:** `MeetingDetailScreen`: show transcript / summary / action items (checkable via `toggleActionItem`).

- [ ] **Step 5:** `BrainScreen`: full-screen `GraphWebView` seeded from `getGraph()`; on `onNodeTap`, bottom sheet with the node label, `mentionCount`, and meetings it appears in.

- [ ] **Step 6:** `AskScreen`: text input → `ask()` → render answer + citation chips linking to meetings.

- [ ] **Step 7:** `AppNavigator.tsx`: tab/stack nav (Meetings, Brain, Ask) following Obscura's `AppNavigator` pattern. `App.tsx` mounts it and calls `installLifecycle()` (returns cleanup in `useEffect`).

- [ ] **Step 8:** Manual device run of the full loop: record → live graph growth → meeting detail → brain → ask. Commit `git add -A && git commit -m "feat: screens + navigation + RAG ask; full local loop"`.

---

## Task 11: Polish + error states + perf

**Files:**
- Modify: pipeline + screens; copy `obscura/src/perf/perfLog.ts` into `cortex/src/perf/`.

- [ ] **Step 1:** Add per-stage perf logging (reuse Obscura's `perfLog`) around each model load/run/unload; log to console for the demo.
- [ ] **Step 2:** Error UX: if `runSession` sets `status:"error"`, show a retry on the meeting card; guard missing-audio (file not found) like Obscura's pipeline guard.
- [ ] **Step 3:** Bloom/glow + force params tuning pass on device for the demo look.
- [ ] **Step 4:** Update `cortex/README.md` (from Obscura's) with run instructions and the model list.
- [ ] **Step 5:** Commit `git add -A && git commit -m "feat: perf logging, error states, graph polish, docs"`.

---

## Self-Review

**Spec coverage:** §2 goals → record (T4), pipeline (T5,6,8), live graph hero (T6,9,10), meeting detail (T10), RAG (T10/ask), all-local (global constraints) ✓. §4 QVAC API → T5,6 ✓. §5 data model → T2,3,7 ✓. §6 modules → all files mapped ✓. §7 risks → audio format (T0 gate), bad JSON (T5/T6 tolerant parser), memory (sequential load/unload enforced T5,8), bridge spam (T9 coalescing) ✓. §10 build order → Tasks 0–11 follow it ✓.

**Placeholder scan:** No TBD/TODO; testable units carry real test code; UI/native/WebView tasks are step-lists with concrete code/config (correct — they aren't unit-testable, manual device checks specified).

**Type consistency:** `Float32Array` embeddings throughout (`embedText`, `upsertNode`, `searchChunks`, `vectors.ts`). `Stage` union shared (types.ts) across `stages.ts`/`runSession`/screens. `upsertNode`/`insertEdge`/`getGraph` names consistent T7↔T8↔T10. `parseSummary`/`createArrayItemParser` exported where tested.
