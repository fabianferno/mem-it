# mem-it UX polish + on-device vision — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the QVAC brand + a product tagline to Home, fix the Recall keyboard, turn Recall into a persistent conversational "Agent", rename the Mems tab to Home, and add on-device photo capture + QVAC vision analysis to a meeting.

**Architecture:** All changes live in the `cortex/` Expo app. Two new SQLite tables (`agent_messages`, `meeting_attachments`) with thin accessors mirror the existing `db/meetings.ts` pattern. A new `qvac/vision.ts` wrapper follows the exact load → infer → unload discipline of `qvac/summarize.ts`, using the QVAC multimodal model `QWEN3VL_2B_MULTIMODAL_Q4_K` + its `MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K` projector (passed via `modelConfig.projectionModelSrc`), with the image supplied as a `completion()` history attachment. UI changes are confined to four screens and the navigator. Nothing touches the core record→STT→summarize→extract→embed pipeline or `rag/ask.ts`.

**Tech Stack:** Expo SDK 56 / React Native 0.85 / React 19, TypeScript, `expo-sqlite`, `expo-image-picker` (new), `@qvac/sdk`, Jest (logic only — device boundary mocked under `__mocks__/`).

## Global Constraints

- **On-device only.** No network calls; no cloud APIs. All inference runs through `@qvac/sdk`. (Copied from spec non-goals.)
- **One QVAC model resident at a time** — load → infer → unload. Never hold two models concurrently. (CLAUDE.md central constraint.)
- **Expo SDK 56** — read versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing native/Expo code; don't rely on memory of older Expo APIs.
- **`rag/ask.ts` is unchanged.** The Agent feature is storage + presentation only; each turn answers independently (stateless turns — no cross-turn memory).
- **Photo analysis never merges into the meeting summary.** Photos + their analysis live only in their own section.
- **Nav rename "Mems" → "Home" is the bottom-tab label only.** The in-screen "Mems" heading on `MeetingsScreen` stays.
- **Tagline copy (verbatim):** eyebrow `"Conversational Knowledge Engine"`, subtitle `"Record. Recall. Everything stays on your phone."`
- **Test pattern:** pure logic is unit-tested against `__mocks__/`; `beforeEach(() => __resetDbForTests())` for DB tests. Native inference (real multimodal) is device-only and not unit-tested. `npm test` must stay green.
- **No `react-native-svg`.** The QVAC logo ships as a rasterized PNG rendered via `<Image>`.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `cortex/src/types.ts` | Add `AgentMessage`, `MeetingAttachment` types | 1, 2 |
| `cortex/src/db/schema.ts` | Add `agent_messages`, `meeting_attachments` DDL | 1, 2 |
| `cortex/src/db/agent.ts` (new) | Agent message accessors | 1 |
| `cortex/src/db/agent.test.ts` (new) | Agent storage unit tests | 1 |
| `cortex/src/db/attachments.ts` (new) | Meeting attachment accessors | 2 |
| `cortex/src/db/attachments.test.ts` (new) | Attachment storage unit tests | 2 |
| `cortex/src/qvac/models.ts` | Add `VISION_MODEL`, `VISION_MMPROJ` | 3 |
| `cortex/src/qvac/vision.ts` (new) | Multimodal image analysis wrapper + pure helpers | 3 |
| `cortex/src/qvac/vision.test.ts` (new) | Pure-helper unit tests | 3 |
| `cortex/assets/qvac-logo.png` (new) | Rasterized QVAC wordmark | 4 |
| `cortex/src/screens/MeetingsScreen.tsx` | Home hero copy + "Powered by QVAC" lockup | 4 |
| `cortex/src/screens/AskScreen.tsx` | Keyboard fix + persistent chat history (Agent) | 5 |
| `cortex/src/navigation/AppNavigator.tsx` | Tab labels: "Recall"→"Agent", "Mems"→"Home" | 6 |
| `cortex/src/screens/MeetingDetailScreen.tsx` | Photos section + capture | 7 |
| `cortex/package.json` | Add `expo-image-picker` | 7 |

**Dependency order:** Task 5 consumes Task 1; Task 7 consumes Tasks 2 and 3. Tasks 4 and 6 are independent. Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7.

---

## Task 1: Agent message storage

**Files:**
- Modify: `cortex/src/types.ts` (append `AgentMessage`)
- Modify: `cortex/src/db/schema.ts` (append DDL to the `DDL` array)
- Create: `cortex/src/db/agent.ts`
- Test: `cortex/src/db/agent.test.ts`

**Interfaces:**
- Consumes: `openDb`, `newId` from `./sqlite`; `ToolName` from `../rag/ask`.
- Produces:
  - `interface AgentMessage { id: string; role: "user" | "assistant"; content: string; usedTool: ToolName | null; citations: Citation[]; createdAt: number; }`
  - `appendAgentMessage(msg: Omit<AgentMessage, "id" | "createdAt">): AgentMessage`
  - `getAgentMessages(): AgentMessage[]` (oldest-first)
  - `clearAgentMessages(): void`

- [ ] **Step 1: Add the `AgentMessage` type**

In `cortex/src/types.ts`, append at the end of the file:

```typescript
import type { Citation, ToolName } from "./rag/ask";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Which tool the assistant used (assistant turns only); null for user turns. */
  usedTool: ToolName | null;
  /** Citations attached to an assistant turn; empty for user turns. */
  citations: Citation[];
  createdAt: number;
}
```

> Note: `types.ts` currently has no imports. Add the `import type` line at the **top** of the file, not the bottom — only the interface goes at the bottom.

- [ ] **Step 2: Add the `agent_messages` table DDL**

In `cortex/src/db/schema.ts`, add this string as a new element at the end of the `DDL` array (after the `chunks` table, before the closing `];`):

```typescript
  `CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    role TEXT,
    content TEXT,
    used_tool TEXT,
    citations TEXT,
    created_at INTEGER
  )`,
```

- [ ] **Step 3: Write the failing test**

Create `cortex/src/db/agent.test.ts`:

```typescript
import { appendAgentMessage, getAgentMessages, clearAgentMessages } from "./agent";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

test("append + fetch a user message", () => {
  appendAgentMessage({ role: "user", content: "what did we decide?", usedTool: null, citations: [] });
  const msgs = getAgentMessages();
  expect(msgs).toHaveLength(1);
  expect(msgs[0].role).toBe("user");
  expect(msgs[0].content).toBe("what did we decide?");
  expect(msgs[0].usedTool).toBeNull();
  expect(msgs[0].citations).toEqual([]);
});

test("assistant message round-trips usedTool + citations", () => {
  appendAgentMessage({
    role: "assistant",
    content: "We decided to ship Friday.",
    usedTool: "search_memory",
    citations: [{ meetingId: "m1", meetingTitle: "Standup", text: "ship Friday" }],
  });
  const m = getAgentMessages()[0];
  expect(m.usedTool).toBe("search_memory");
  expect(m.citations).toHaveLength(1);
  expect(m.citations[0].meetingTitle).toBe("Standup");
});

test("getAgentMessages returns oldest-first", () => {
  const a = appendAgentMessage({ role: "user", content: "first", usedTool: null, citations: [] });
  const b = appendAgentMessage({ role: "assistant", content: "second", usedTool: "list_todos", citations: [] });
  const ids = getAgentMessages().map((m) => m.id);
  expect(ids).toEqual([a.id, b.id]);
});

test("clearAgentMessages empties the conversation", () => {
  appendAgentMessage({ role: "user", content: "hi", usedTool: null, citations: [] });
  clearAgentMessages();
  expect(getAgentMessages()).toHaveLength(0);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd cortex && npx jest src/db/agent.test.ts`
Expected: FAIL — `Cannot find module './agent'`.

- [ ] **Step 5: Implement the accessors**

Create `cortex/src/db/agent.ts`:

```typescript
import type { AgentMessage } from "../types";
import { openDb, newId } from "./sqlite";

type AgentRow = {
  id: string;
  role: AgentMessage["role"];
  content: string;
  used_tool: AgentMessage["usedTool"];
  citations: string | null;
  created_at: number;
};

function toMessage(r: AgentRow): AgentMessage {
  let citations: AgentMessage["citations"] = [];
  if (r.citations) {
    try {
      const parsed = JSON.parse(r.citations);
      if (Array.isArray(parsed)) citations = parsed;
    } catch {
      citations = [];
    }
  }
  return {
    id: r.id,
    role: r.role,
    content: r.content,
    usedTool: r.used_tool ?? null,
    citations,
    createdAt: r.created_at,
  };
}

/** Persist one turn. Counter in the id keeps insert order stable within a tick. */
export function appendAgentMessage(
  msg: Omit<AgentMessage, "id" | "createdAt">
): AgentMessage {
  const full: AgentMessage = { ...msg, id: newId(), createdAt: Date.now() };
  openDb().runSync(
    `INSERT INTO agent_messages (id, role, content, used_tool, citations, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      full.id,
      full.role,
      full.content,
      full.usedTool,
      JSON.stringify(full.citations),
      full.createdAt,
    ]
  );
  return full;
}

export function getAgentMessages(): AgentMessage[] {
  const rows = openDb().getAllSync(
    `SELECT * FROM agent_messages ORDER BY created_at ASC, rowid ASC`
  ) as AgentRow[];
  return rows.map(toMessage);
}

export function clearAgentMessages(): void {
  openDb().runSync(`DELETE FROM agent_messages`);
}
```

> The `rowid ASC` tiebreaker keeps order stable when two inserts land in the same millisecond.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd cortex && npx jest src/db/agent.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd cortex && npm test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add cortex/src/types.ts cortex/src/db/schema.ts cortex/src/db/agent.ts cortex/src/db/agent.test.ts
git commit -m "feat(cortex): persistent agent_messages storage"
```

---

## Task 2: Meeting attachment storage

**Files:**
- Modify: `cortex/src/types.ts` (append `MeetingAttachment`)
- Modify: `cortex/src/db/schema.ts` (append DDL)
- Create: `cortex/src/db/attachments.ts`
- Test: `cortex/src/db/attachments.test.ts`

**Interfaces:**
- Consumes: `openDb`, `newId` from `./sqlite`.
- Produces:
  - `type AttachmentStatus = "analyzing" | "done" | "error"`
  - `interface MeetingAttachment { id: string; meetingId: string; uri: string; analysis: string | null; status: AttachmentStatus; createdAt: number; }`
  - `addAttachment(meetingId: string, uri: string): MeetingAttachment` (starts `status: "analyzing"`)
  - `getAttachments(meetingId: string): MeetingAttachment[]` (oldest-first)
  - `updateAttachmentAnalysis(id: string, analysis: string | null, status: AttachmentStatus): void`
  - `deleteAttachment(id: string): void`

- [ ] **Step 1: Add the types**

In `cortex/src/types.ts`, append:

```typescript
export type AttachmentStatus = "analyzing" | "done" | "error";

export interface MeetingAttachment {
  id: string;
  meetingId: string;
  uri: string;
  analysis: string | null;
  status: AttachmentStatus;
  createdAt: number;
}
```

- [ ] **Step 2: Add the `meeting_attachments` table DDL**

In `cortex/src/db/schema.ts`, add to the `DDL` array:

```typescript
  `CREATE TABLE IF NOT EXISTS meeting_attachments (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    uri TEXT,
    analysis TEXT,
    status TEXT,
    created_at INTEGER
  )`,
```

- [ ] **Step 3: Write the failing test**

Create `cortex/src/db/attachments.test.ts`:

```typescript
import {
  addAttachment,
  getAttachments,
  updateAttachmentAnalysis,
  deleteAttachment,
} from "./attachments";
import { __resetDbForTests } from "./sqlite";

beforeEach(() => __resetDbForTests());

test("addAttachment starts in 'analyzing' with null analysis", () => {
  const a = addAttachment("m1", "file:///photo.jpg");
  expect(a.meetingId).toBe("m1");
  expect(a.uri).toBe("file:///photo.jpg");
  expect(a.status).toBe("analyzing");
  expect(a.analysis).toBeNull();
});

test("getAttachments scopes to the meeting, oldest-first", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  const b = addAttachment("m1", "file:///b.jpg");
  addAttachment("m2", "file:///c.jpg");
  const ids = getAttachments("m1").map((x) => x.id);
  expect(ids).toEqual([a.id, b.id]);
});

test("updateAttachmentAnalysis sets text + status", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  updateAttachmentAnalysis(a.id, "A page of handwritten notes about Q3 goals.", "done");
  const got = getAttachments("m1")[0];
  expect(got.status).toBe("done");
  expect(got.analysis).toBe("A page of handwritten notes about Q3 goals.");
});

test("deleteAttachment removes only that row", () => {
  const a = addAttachment("m1", "file:///a.jpg");
  const b = addAttachment("m1", "file:///b.jpg");
  deleteAttachment(a.id);
  const ids = getAttachments("m1").map((x) => x.id);
  expect(ids).toEqual([b.id]);
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd cortex && npx jest src/db/attachments.test.ts`
Expected: FAIL — `Cannot find module './attachments'`.

- [ ] **Step 5: Implement the accessors**

Create `cortex/src/db/attachments.ts`:

```typescript
import type { MeetingAttachment, AttachmentStatus } from "../types";
import { openDb, newId } from "./sqlite";

type AttachmentRow = {
  id: string;
  meeting_id: string;
  uri: string;
  analysis: string | null;
  status: AttachmentStatus;
  created_at: number;
};

function toAttachment(r: AttachmentRow): MeetingAttachment {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    uri: r.uri,
    analysis: r.analysis,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function addAttachment(meetingId: string, uri: string): MeetingAttachment {
  const a: MeetingAttachment = {
    id: newId(),
    meetingId,
    uri,
    analysis: null,
    status: "analyzing",
    createdAt: Date.now(),
  };
  openDb().runSync(
    `INSERT INTO meeting_attachments (id, meeting_id, uri, analysis, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [a.id, a.meetingId, a.uri, a.analysis, a.status, a.createdAt]
  );
  return a;
}

export function getAttachments(meetingId: string): MeetingAttachment[] {
  const rows = openDb().getAllSync(
    `SELECT * FROM meeting_attachments WHERE meeting_id = ? ORDER BY created_at ASC, rowid ASC`,
    [meetingId]
  ) as AttachmentRow[];
  return rows.map(toAttachment);
}

export function updateAttachmentAnalysis(
  id: string,
  analysis: string | null,
  status: AttachmentStatus
): void {
  openDb().runSync(`UPDATE meeting_attachments SET analysis = ?, status = ? WHERE id = ?`, [
    analysis,
    status,
    id,
  ]);
}

export function deleteAttachment(id: string): void {
  openDb().runSync(`DELETE FROM meeting_attachments WHERE id = ?`, [id]);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd cortex && npx jest src/db/attachments.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Wire attachment cleanup into `deleteMeeting`**

In `cortex/src/db/meetings.ts`, inside `deleteMeeting`, add a delete for attachments next to the other owned-row deletes (after the `edges` delete on line ~125):

```typescript
  db.runSync(`DELETE FROM meeting_attachments WHERE meeting_id = ?`, [id]);
```

- [ ] **Step 8: Run the full suite**

Run: `cd cortex && npm test`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add cortex/src/types.ts cortex/src/db/schema.ts cortex/src/db/attachments.ts cortex/src/db/attachments.test.ts cortex/src/db/meetings.ts
git commit -m "feat(cortex): meeting_attachments storage + delete cleanup"
```

---

## Task 3: QVAC vision wrapper

**Files:**
- Modify: `cortex/src/qvac/models.ts` (add `VISION_MODEL`, `VISION_MMPROJ`)
- Create: `cortex/src/qvac/vision.ts`
- Test: `cortex/src/qvac/vision.test.ts`

**Interfaces:**
- Consumes: `loadModel`, `completion`, `unloadModel`, `QWEN3VL_2B_MULTIMODAL_Q4_K`, `MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K` from `@qvac/sdk`; `timed` from `../perf/perfLog`.
- Produces:
  - `VISION_PROMPT: string` (the instruction the model receives)
  - `cleanVisionOutput(raw: string): string` (pure trim/normalize)
  - `analyzeImage(uri: string, onToken?: (t: string) => void): Promise<string>`

> **Why this model:** `QWEN3VL_2B_MULTIMODAL_Q4_K` is a 2B vision-language model — strong at both OCR (paper notes) and general scene description (places, people, objects). Its projector is the matching `MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K`, passed via `modelConfig.projectionModelSrc` (confirmed against `@qvac/sdk` `llmConfigBaseSchema`). The image is supplied as a `completion()` history attachment `{ path }`; the `llamacpp-completion` plugin routes it through its `mtmd` multimodal path.

- [ ] **Step 1: Register the vision model constants**

Replace the contents of `cortex/src/qvac/models.ts` with:

```typescript
import {
  WHISPER_SMALL_Q8_0,
  LLAMA_3_2_1B_INST_Q4_0,
  GTE_LARGE_FP16,
  QWEN3VL_2B_MULTIMODAL_Q4_K,
  MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K,
} from "@qvac/sdk";

// The models mem-it uses. One per pipeline stage, no alternatives.
export const STT_MODEL = WHISPER_SMALL_Q8_0;
export const LLM_MODEL = LLAMA_3_2_1B_INST_Q4_0;
export const EMBED_MODEL = GTE_LARGE_FP16;
// Multimodal: describes a captured photo (notes, places, people, objects).
// Loaded only while analyzing an attachment; unloaded immediately after.
export const VISION_MODEL = QWEN3VL_2B_MULTIMODAL_Q4_K;
export const VISION_MMPROJ = MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K;
```

- [ ] **Step 2: Add the two constants to the `@qvac/sdk` mock**

In `cortex/__mocks__/@qvac/sdk.ts`, add to the "Model constants" block (after `GTE_LARGE_FP16`):

```typescript
export const QWEN3VL_2B_MULTIMODAL_Q4_K = "QWEN3VL_2B_MULTIMODAL_Q4_K";
export const MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K = "MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K";
```

- [ ] **Step 3: Write the failing test (pure helpers)**

Create `cortex/src/qvac/vision.test.ts`:

```typescript
import { cleanVisionOutput, VISION_PROMPT } from "./vision";

test("cleanVisionOutput trims whitespace and collapses blank runs", () => {
  expect(cleanVisionOutput("  A whiteboard with Q3 goals.\n\n\n\nThree bullet points. ")).toBe(
    "A whiteboard with Q3 goals.\n\nThree bullet points."
  );
});

test("cleanVisionOutput returns empty string for whitespace-only input", () => {
  expect(cleanVisionOutput("   \n\n ")).toBe("");
});

test("VISION_PROMPT asks for both verbatim text and a scene description", () => {
  expect(VISION_PROMPT.toLowerCase()).toContain("text");
  expect(VISION_PROMPT.toLowerCase()).toContain("describe");
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd cortex && npx jest src/qvac/vision.test.ts`
Expected: FAIL — `Cannot find module './vision'`.

- [ ] **Step 5: Implement `vision.ts`**

Create `cortex/src/qvac/vision.ts`:

```typescript
import { loadModel, completion, unloadModel } from "@qvac/sdk";
import { VISION_MODEL, VISION_MMPROJ } from "./models";
import { timed } from "../perf/perfLog";

/** Strip an expo `file://` URI down to the bare path QVAC's loaders expect. */
function barePath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

/** What the multimodal model is asked to do with a captured photo. */
export const VISION_PROMPT =
  "Look at this image. If it contains any handwritten or printed text, transcribe that text verbatim. " +
  "Then describe what the image shows — the scene, people, place, or objects — in 2-4 sentences. " +
  "Be concise and factual.";

/** Pure: trim and collapse 3+ blank lines to a single blank line. */
export function cleanVisionOutput(raw: string): string {
  return raw.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Analyze a captured image with a QVAC multimodal model. Loads the VLM (with its
 * mmproj projector), runs once with the image as an attachment, then unloads —
 * the load → infer → unload discipline. Returns the cleaned description.
 */
export async function analyzeImage(
  uri: string,
  onToken?: (t: string) => void
): Promise<string> {
  return timed(
    { stage: "vision", model: VISION_MODEL.name, modelType: "llm" },
    () =>
      loadModel({
        modelSrc: VISION_MODEL,
        modelType: "llm",
        modelConfig: {
          ctx_size: 4096,
          predict: 512,
          repeat_penalty: 1.1,
          // The multimodal projector that lets the LLM consume image tokens.
          projectionModelSrc: VISION_MMPROJ,
        },
      }),
    async (ctx, modelId) => {
      const run = completion({
        modelId,
        history: [
          {
            role: "user",
            content: VISION_PROMPT,
            attachments: [{ path: barePath(uri) }],
          },
        ],
        stream: true,
      });
      let raw = "";
      for await (const tok of run.tokenStream) {
        ctx.markFirstToken();
        ctx.addTokens(1);
        raw += tok;
        onToken?.(tok);
      }
      const final = await run.final;
      const text = final.contentText?.trim() || final.raw?.fullText?.trim() || raw;
      return cleanVisionOutput(text);
    },
    (modelId) => unloadModel({ modelId })
  );
}
```

> **Device-only verification (not unit-tested):** On first real-device run, confirm (a) the prebuilt `qvac/worker.bundle.js` includes the `llamacpp-completion` (`PLUGIN_LLM`) plugin with multimodal/mtmd support — it already serves the Llama text path, so the engine is present; verify it accepts `projectionModelSrc` + image attachments; (b) the `QWEN3VL_2B_MULTIMODAL_Q4_K` + projector load within memory limits on the iPhone 14 Pro when loaded alone. If the 2B model is too heavy, swap `VISION_MODEL`/`VISION_MMPROJ` in `models.ts` to a smaller multimodal pair (e.g. a SmolVLM2-500M base with `MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0`) — the wrapper code is unchanged.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd cortex && npx jest src/qvac/vision.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the full suite**

Run: `cd cortex && npm test`
Expected: all PASS (existing `models.test.ts` still green).

- [ ] **Step 8: Commit**

```bash
git add cortex/src/qvac/models.ts cortex/src/qvac/vision.ts cortex/src/qvac/vision.test.ts "cortex/__mocks__/@qvac/sdk.ts"
git commit -m "feat(cortex): on-device vision wrapper (Qwen3-VL 2B multimodal)"
```

---

## Task 4: QVAC logo + Home hero copy

**Files:**
- Create: `cortex/assets/qvac-logo.png` (rasterized from `qvac-logo.svg` at repo root)
- Modify: `cortex/src/screens/MeetingsScreen.tsx`

This task is UI-only; the repo does not unit-test screens (device/WebGL boundary). Verification is manual.

- [ ] **Step 1: Rasterize the SVG logo to PNG**

The source is `qvac-logo.svg` (repo root, 218×24, teal `#16E3C1` wordmark on transparent). Produce a 3× PNG.

Primary (librsvg — `brew install librsvg` if missing):

```bash
cd /Users/fabianferno/Documents/wack
rsvg-convert -w 654 -h 72 qvac-logo.svg -o cortex/assets/qvac-logo.png
```

Fallback (macOS Quick Look, no install):

```bash
cd /Users/fabianferno/Documents/wack
qlmanage -t -s 654 -o cortex/assets qvac-logo.svg && mv cortex/assets/qvac-logo.svg.png cortex/assets/qvac-logo.png
```

Verify the file exists and is non-empty:

```bash
ls -la cortex/assets/qvac-logo.png
```

Expected: a PNG file, > 1 KB.

- [ ] **Step 2: Add the hero copy + "Powered by QVAC" lockup**

In `cortex/src/screens/MeetingsScreen.tsx`:

(a) Ensure `Image` is imported (it already is, line 6).

(b) Replace the subtitle block (lines 81–85) — the `<Text style={styles.h1}>Mems</Text>` and the existing subtitle — with the eyebrow + heading + new subtitle:

```tsx
      <Text style={styles.eyebrow}>Conversational Knowledge Engine</Text>
      <Text style={styles.h1}>Mems</Text>
      <Text style={styles.subtitle}>Record. Recall. Everything stays on your phone.</Text>
```

(c) Add a "Powered by QVAC" lockup at the very bottom of the hero `<View style={styles.hero}>` block — insert it as a sibling right after the `LinearGradient` (after line 96, before the closing `</View>` of `styles.hero`):

```tsx
        <View style={styles.poweredBy} pointerEvents="none">
          <Text style={styles.poweredByText}>Powered by</Text>
          <Image
            source={require("../../assets/qvac-logo.png")}
            style={styles.qvacLogo}
            resizeMode="contain"
          />
        </View>
```

(d) Add these style entries to the `StyleSheet.create({ ... })` block:

```tsx
  eyebrow: {
    color: theme.color.accent,
    ...theme.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: theme.space.md,
    marginBottom: 2,
  },
  poweredBy: {
    position: "absolute",
    bottom: theme.space.sm,
    left: theme.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.85,
  },
  poweredByText: { color: theme.color.textMuted, ...theme.type.caption },
  qvacLogo: { width: 90, height: 10 },
```

> The logo's native aspect ratio is 218:24 ≈ 9.08:1; `width: 90, height: 10` (9:1) keeps it crisp with `resizeMode="contain"`.

- [ ] **Step 3: Verify it builds**

Run: `cd cortex && npx tsc --noEmit`
Expected: no type errors. (If `tsc` is slow/unavailable, at minimum confirm the file has no syntax errors via `npx jest --listTests` succeeding.)

- [ ] **Step 4: Manual device/simulator check**

Run the app (`npm run ios` on the device, or Expo). Confirm on Home: eyebrow "Conversational Knowledge Engine", the new subtitle, and a small teal "Powered by QVAC" lockup over the hero. (Document this as the manual verification — it's the repo's accepted check for UI.)

- [ ] **Step 5: Commit**

```bash
git add cortex/assets/qvac-logo.png cortex/src/screens/MeetingsScreen.tsx
git commit -m "feat(cortex): QVAC logo + Conversational Knowledge Engine hero on Home"
```

---

## Task 5: Agent screen — keyboard fix + persistent chat history

**Files:**
- Modify: `cortex/src/screens/AskScreen.tsx` (rewrite the component; keep the filename)

**Interfaces:**
- Consumes: `appendAgentMessage`, `getAgentMessages`, `clearAgentMessages` from `../db/agent` (Task 1); `ask`, `AskResult` from `../rag/ask` (unchanged); `AgentMessage` from `../types`.

This rewrite (a) loads + renders the full persisted conversation so the page is never empty on return, (b) persists each user turn and assistant turn, (c) fixes the keyboard hiding the input by setting a `keyboardVerticalOffset` and auto-scrolling to the latest message.

- [ ] **Step 1: Rewrite `AskScreen.tsx`**

Replace the entire contents of `cortex/src/screens/AskScreen.tsx` with:

```tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme";
import { GlassCard } from "../ui/GlassCard";
import { EmptyState } from "../ui/EmptyState";
import { ask } from "../rag/ask";
import { getAgentMessages, appendAgentMessage, clearAgentMessages } from "../db/agent";
import type { AgentMessage } from "../types";

export function AskScreen() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>(() => getAgentMessages());
  const scrollRef = useRef<ScrollView>(null);

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  // Keep the latest message visible when the keyboard opens.
  useEffect(() => {
    const evt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(evt, scrollToEnd);
    return () => sub.remove();
  }, []);

  async function run() {
    if (!q.trim() || loading) return;
    const question = q.trim();
    setQ("");
    setLoading(true);
    setStreaming("");
    appendAgentMessage({ role: "user", content: question, usedTool: null, citations: [] });
    setMessages(getAgentMessages());
    scrollToEnd();
    try {
      const res = await ask(question, (tok) => {
        setStreaming((prev) => prev + tok);
        scrollToEnd();
      });
      appendAgentMessage({
        role: "assistant",
        content: res.answer,
        usedTool: res.usedTool,
        citations: res.citations,
      });
      setMessages(getAgentMessages());
    } finally {
      setStreaming("");
      setLoading(false);
      scrollToEnd();
    }
  }

  function clearConversation() {
    clearAgentMessages();
    setMessages([]);
  }

  const empty = messages.length === 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <View style={styles.titleRow}>
        <Text style={styles.h1}>Agent</Text>
        {messages.length > 0 && (
          <Pressable onPress={clearConversation} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, empty && styles.scrollEmpty]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={scrollToEnd}
      >
        {empty && (
          <EmptyState>
            Ask your second brain. The agent searches your recorded mems and action items to answer —
            fully on-device.
          </EmptyState>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <View key={m.id} style={styles.userBubble}>
              <Text style={styles.userText}>{m.content}</Text>
            </View>
          ) : (
            <View key={m.id}>
              <GlassCard>
                <View style={styles.toolChip}>
                  <Ionicons
                    name={m.usedTool === "list_todos" ? "checkbox-outline" : "search-outline"}
                    size={12}
                    color={theme.color.accent}
                  />
                  <Text style={styles.toolChipText}>
                    {m.usedTool === "list_todos" ? "Action items" : "Memory search"}
                  </Text>
                </View>
                <Text style={styles.body}>{m.content}</Text>
              </GlassCard>
              {m.citations.map((c, i) => (
                <GlassCard key={`${m.id}-${i}`}>
                  <Text style={styles.cite}>{c.meetingTitle}</Text>
                  <Text style={styles.citeText} numberOfLines={3}>
                    {c.text}
                  </Text>
                </GlassCard>
              ))}
            </View>
          )
        )}

        {loading && streaming === "" && (
          <ActivityIndicator color={theme.color.accent} style={{ marginTop: theme.space.md }} />
        )}
        {loading && streaming !== "" && (
          <GlassCard>
            <Text style={styles.body}>{streaming}</Text>
          </GlassCard>
        )}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={q}
          onChangeText={setQ}
          placeholder="Ask your second brain…"
          placeholderTextColor={theme.color.textMuted}
          onSubmitEditing={run}
          returnKeyType="send"
          multiline
        />
        <Pressable style={[styles.sendBtn, !q.trim() && styles.sendBtnDim]} onPress={run}>
          <Ionicons name="arrow-up" color={theme.color.onAccent} size={22} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg, paddingTop: theme.space.xl },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.md,
  },
  h1: { color: theme.color.text, ...theme.type.display },
  clearText: { color: theme.color.textMuted, ...theme.type.body, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.space.md, gap: theme.space.md },
  scrollEmpty: { flexGrow: 1 },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.md,
  },
  userText: { color: theme.color.onAccent, ...theme.type.body },
  toolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: theme.space.xs,
  },
  toolChipText: {
    color: theme.color.accent,
    ...theme.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: { color: theme.color.text, ...theme.type.body, lineHeight: 22 },
  cite: { color: theme.color.ink, ...theme.type.caption, fontWeight: "700" },
  citeText: { color: theme.color.textMuted, ...theme.type.caption, marginTop: theme.space.xs },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.space.sm,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.glassBorder,
    backgroundColor: theme.color.surface,
  },
  input: {
    flex: 1,
    color: theme.color.text,
    backgroundColor: theme.color.glassFill,
    borderWidth: 1,
    borderColor: theme.color.glassBorder,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingTop: theme.space.sm,
    paddingBottom: theme.space.sm,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDim: { opacity: 0.5 },
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd cortex && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Run the full suite**

Run: `cd cortex && npm test`
Expected: all PASS (no test imports `AskScreen`; this confirms nothing else broke).

- [ ] **Step 4: Manual device check**

On device: open Agent tab, ask a question → answer streams and persists. Navigate away and back → the conversation is still shown (not empty). Tap the input → the field stays visible above the keyboard and the view scrolls to the latest message. "Clear" empties the thread.

- [ ] **Step 5: Commit**

```bash
git add cortex/src/screens/AskScreen.tsx
git commit -m "feat(cortex): conversational Agent with persistent history + keyboard fix"
```

---

## Task 6: Rename nav tabs (Recall → Agent, Mems → Home)

**Files:**
- Modify: `cortex/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Rename the "Mems" tab label to "Home"**

In `cortex/src/navigation/AppNavigator.tsx`, in the first `<NavTab>` (lines 65–69), change `label="Mems"` to `label="Home"`. Leave its `Ionicons name="list"` icon and `onPress` unchanged.

```tsx
            <NavTab
              label="Home"
              active={tab === "meetings"}
              onPress={() => setScreen({ name: "meetings" })}
              render={(color, size) => <Ionicons name="list" color={color} size={size} />}
            />
```

- [ ] **Step 2: Rename the "Recall" tab to "Agent" with a conversation glyph**

In the last `<NavTab>` (lines 91–96), change `label="Recall"` to `label="Agent"` and swap the icon to `chatbubbles-outline`:

```tsx
            <NavTab
              label="Agent"
              active={tab === "ask"}
              onPress={() => setScreen({ name: "ask" })}
              render={(color, size) => (
                <Ionicons name="chatbubbles-outline" color={color} size={size} />
              )}
            />
```

> Keep the internal screen key `"ask"` and the `AskScreen` import unchanged — only the visible label and icon change.

- [ ] **Step 3: Verify it type-checks**

Run: `cd cortex && npx tsc --noEmit`
Expected: no errors. (`chatbubbles-outline` is a valid Ionicons name.)

- [ ] **Step 4: Manual check**

On device: bottom nav reads **Home · Act · (mic) · Memhive · Agent**. The Agent tab shows a chat-bubble icon.

- [ ] **Step 5: Commit**

```bash
git add cortex/src/navigation/AppNavigator.tsx
git commit -m "feat(cortex): rename nav tabs — Mems→Home, Recall→Agent"
```

---

## Task 7: Photos section + capture in Meeting Detail

**Files:**
- Modify: `cortex/package.json` (add `expo-image-picker`)
- Modify: `cortex/src/screens/MeetingDetailScreen.tsx`

**Interfaces:**
- Consumes: `addAttachment`, `getAttachments`, `updateAttachmentAnalysis`, `deleteAttachment` from `../db/attachments` (Task 2); `analyzeImage` from `../qvac/vision` (Task 3); `MeetingAttachment` from `../types`.

> **Concurrency note:** vision analysis loads a model, so it must not run while the recording pipeline is active. Guard on `proc.active` (already available via `useProcessing()` in this screen) and surface an alert if busy — same pattern as the existing `retry()`.

- [ ] **Step 1: Install `expo-image-picker`**

```bash
cd cortex && npx expo install expo-image-picker
```

Expected: `expo-image-picker` added to `package.json` dependencies. (`npx expo install` picks the SDK-56-compatible version.)

- [ ] **Step 2: Add imports to `MeetingDetailScreen.tsx`**

At the top of `cortex/src/screens/MeetingDetailScreen.tsx`, add:

```tsx
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getAttachments,
  addAttachment,
  updateAttachmentAnalysis,
  deleteAttachment,
} from "../db/attachments";
import { analyzeImage } from "../qvac/vision";
import type { MeetingAttachment } from "../types";
```

> `react-native` is already imported on line 2; add `Image` to that existing destructured import instead of a separate line if you prefer — either is fine. `ActionItem` is already imported on line 11; extend that `import type` line with `MeetingAttachment` rather than duplicating.

- [ ] **Step 3: Add attachment state + handlers inside the component**

Inside `MeetingDetailScreen`, after the existing `const [items, setItems] = ...` (line 43), add:

```tsx
  const [attachments, setAttachments] = useState<MeetingAttachment[]>(() =>
    getAttachments(meetingId)
  );

  async function addPhoto() {
    if (proc.active) {
      Alert.alert("Busy", "A mem is still processing. Try again once it finishes.");
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const useCamera = perm.granted;
    const picked = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (picked.canceled || !picked.assets?.[0]) return;
    const uri = picked.assets[0].uri;

    const att = addAttachment(meetingId, uri);
    setAttachments(getAttachments(meetingId));
    try {
      const analysis = await analyzeImage(uri);
      updateAttachmentAnalysis(att.id, analysis, "done");
    } catch (e: any) {
      updateAttachmentAnalysis(att.id, e?.message ?? "Analysis failed", "error");
    } finally {
      setAttachments(getAttachments(meetingId));
    }
  }

  function removePhoto(id: string) {
    Alert.alert("Remove photo?", "This deletes the photo and its analysis.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteAttachment(id);
          setAttachments(getAttachments(meetingId));
        },
      },
    ]);
  }
```

> Camera permission may be denied or unavailable (e.g. simulator); we fall back to the photo library so the feature still works. If you want camera-first behavior with an explicit fallback prompt, that's a future refinement — YAGNI for now.

- [ ] **Step 4: Add the Photos section to the render tree**

In the `<ScrollView>`, after the Transcript `<GlassCard>` (closes at line 187), add a new section:

```tsx
        <GlassCard>
          <View style={styles.cardHeader}>
            <Text style={styles.label}>Photos</Text>
            <Pressable onPress={addPhoto} hitSlop={8} style={styles.addPhotoBtn}>
              <Ionicons name="camera-outline" size={15} color={theme.color.accent} />
              <Text style={styles.addPhotoText}>Add photo</Text>
            </Pressable>
          </View>
          {attachments.length === 0 && (
            <Text style={styles.body}>
              Attach a photo of paper notes, a whiteboard, a place, or people — analyzed on-device and
              kept with this mem.
            </Text>
          )}
          {attachments.map((a) => (
            <View key={a.id} style={styles.photoRow}>
              <Image source={{ uri: a.uri }} style={styles.photoThumb} resizeMode="cover" />
              <View style={styles.photoBody}>
                {a.status === "analyzing" && (
                  <View style={styles.building}>
                    <ActivityIndicator size="small" color={theme.color.accent} />
                    <Text style={styles.buildingText}>Analyzing…</Text>
                  </View>
                )}
                {a.status === "done" && <Text style={styles.body}>{a.analysis}</Text>}
                {a.status === "error" && (
                  <Text style={[styles.body, { color: theme.color.danger }]}>
                    {a.analysis ?? "Analysis failed."}
                  </Text>
                )}
                <Pressable onPress={() => removePhoto(a.id)} hitSlop={8}>
                  <Text style={styles.removePhotoText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </GlassCard>
```

- [ ] **Step 5: Add the styles**

Add these entries to the `StyleSheet.create({ ... })` block in `MeetingDetailScreen.tsx`:

```tsx
  addPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addPhotoText: { color: theme.color.accent, ...theme.type.caption, fontWeight: "600" },
  photoRow: { flexDirection: "row", gap: theme.space.sm, paddingVertical: theme.space.sm },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.color.surface,
  },
  photoBody: { flex: 1, gap: theme.space.xs },
  removePhotoText: { color: theme.color.textMuted, ...theme.type.caption },
```

> `styles.building` and `styles.buildingText` already exist in this file (used by the graph-building indicator) and are reused here.

- [ ] **Step 6: Verify it type-checks**

Run: `cd cortex && npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 7: Run the full suite**

Run: `cd cortex && npm test`
Expected: all PASS.

- [ ] **Step 8: Manual device check**

On a real device (vision needs real hardware): open a meeting → Photos section → "Add photo" → take/pick a photo of handwritten notes → "Analyzing…" → the transcribed text + description appears. Repeat with a photo of a place/person → a scene description appears. "Remove" deletes it. Confirm the summary is **unchanged** (analysis stays in Photos only). Confirm "Add photo" is blocked with a "Busy" alert while another mem is processing.

- [ ] **Step 9: Commit**

```bash
git add cortex/package.json cortex/package-lock.json cortex/src/screens/MeetingDetailScreen.tsx
git commit -m "feat(cortex): photo capture + on-device vision analysis on meetings"
```

---

## Self-Review

**Spec coverage:**
- Feature 1 (logo + hero) → Task 4. ✓
- Feature 2 (keyboard fix) → Task 5 (`keyboardVerticalOffset` + auto-scroll). ✓
- Feature 3 (Recall→Agent, persistent history, stateless turns) → Task 1 (storage) + Task 5 (UI) + Task 6 (nav label/icon); `rag/ask.ts` untouched. ✓
- Feature 4 (Mems→Home nav label only) → Task 6. ✓
- Feature 5 (photo + on-device vision, separate section, never merges to summary) → Task 2 (storage) + Task 3 (vision) + Task 7 (UI). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. The one explicitly-deferred item (real multimodal inference on device + memory headroom) is called out as device-only verification with a concrete fallback, consistent with the repo's "inference is device-only" testing philosophy and the spec's risk note. ✓

**Type consistency:** `AgentMessage` (Task 1) is consumed unchanged in Task 5. `MeetingAttachment`/`AttachmentStatus` (Task 2) consumed in Task 7. `analyzeImage(uri, onToken?)` (Task 3) called as `analyzeImage(uri)` in Task 7 (`onToken` optional). `Citation`/`ToolName` imported from `../rag/ask` and reused verbatim. Accessor names match between definition and call sites (`appendAgentMessage`, `getAgentMessages`, `clearAgentMessages`, `addAttachment`, `getAttachments`, `updateAttachmentAnalysis`, `deleteAttachment`). ✓
