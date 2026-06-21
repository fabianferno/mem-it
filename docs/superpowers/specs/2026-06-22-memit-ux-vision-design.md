# mem-it — UX polish + on-device vision

**Date:** 2026-06-22
**Scope:** Five user-requested improvements to the `cortex/` React Native app (mem-it), all on-device, privacy-preserving.

## Context

mem-it is a fully on-device "second brain": record a meeting → Whisper STT → Llama 3.2 1B (summary + action items, then knowledge-graph extraction) → GTE embeddings → SQLite, with a 3D brain graph and a RAG "Recall" agent. No data leaves the phone. Inference runs through `@qvac/sdk`, one model resident at a time (load → infer → unload). Hand-rolled tab nav (`AppNavigator.tsx`), glassmorphism theme (`theme.ts`), `expo-sqlite` storage (`src/db/`).

This change delivers five improvements. None alters the core pipeline or the one-model-at-a-time discipline.

## Goals

1. Surface the QVAC brand (logo) and a product tagline on the Home screen.
2. Fix the Recall input being hidden by the keyboard.
3. Rebrand "Recall" as a conversational **Agent** with persistent, visible history.
4. Rename the bottom-nav "Mems" tab to "Home".
5. Add on-device photo capture + QVAC vision analysis to a meeting, in its own section.

## Non-goals

- No cloud anything. All vision runs on-device via QVAC.
- No cross-turn memory in the Agent (each question answered independently — stateless turns).
- No change to the existing record → STT → summarize → extract → embed pipeline.
- Photo analysis does **not** merge into the meeting summary (separate section only).

---

## Feature 1 — QVAC logo + Home hero copy

**Assets**
- Rasterize `qvac-logo.svg` (teal `#16E3C1` wordmark, transparent bg) → `cortex/assets/qvac-logo.png` at @2x/@3x. No `react-native-svg` dependency; render via the existing `<Image>` pattern.

**Home header (`MeetingsScreen.tsx`)**
- Keep the existing `mem-it` BrandMark.
- Add a subtle "Powered by QVAC" lockup using `qvac-logo.png` (muted, small) so on-device/QVAC backing is visible without competing with the app brand.

**Hero copy (under the hero GIF)**
- Eyebrow: **"Conversational Knowledge Engine"**
- Subtitle: *"Record. Recall. Everything stays on your phone."*
- Existing heading below remains "Mems".

## Feature 2 — Recall/Agent keyboard fix

In the Agent screen (currently `AskScreen.tsx`):
- Set a correct `keyboardVerticalOffset` on the existing `KeyboardAvoidingView` (account for the tab dock height).
- Ensure the input bar rises with the keyboard and the conversation auto-scrolls to the latest message when the keyboard opens and whenever a message is appended.
- Result: the text being typed stays visible above the keyboard.

## Feature 3 — Recall → "Agent" (persistent history, stateless turns)

**Nav (`AppNavigator.tsx`)**
- Rename tab label "Recall" → "Agent". Switch icon to a conversation glyph (e.g. `chatbubbles-outline`). Tab order unchanged.

**Storage (`src/db/schema.ts`, new accessors in `src/db/`)**
- New table `agent_messages`:
  - `id TEXT PRIMARY KEY`
  - `role TEXT` (`'user' | 'assistant'`)
  - `content TEXT`
  - `used_tool TEXT NULL` (`'search_memory' | 'list_todos'`)
  - `citations TEXT NULL` (JSON array of citation objects)
  - `created_at INTEGER`
- Accessors: `getAgentMessages()`, `appendAgentMessage(msg)`, `clearAgentMessages()`.

**UI (rename screen file to `AgentScreen.tsx`, or keep filename and rebrand internally)**
- Render the full persisted message list as a chat transcript (user right-aligned accent bubbles; assistant `GlassCard`s with inline citations and a "searched memory / checked todos" tool chip). The page is **never empty** on return — it shows prior conversation.
- On submit: persist the user message, run the existing `ask(question, onToken)` RAG loop **unchanged** (each turn independent — no prior-turn context passed), stream the answer, then persist the assistant message with its `used_tool` + citations.
- Copy reframed as an agent acting on the knowledge base ("Ask your second brain…").

**Explicitly unchanged:** `src/rag/ask.ts` logic. This feature is storage + presentation only.

## Feature 4 — Bottom-nav "Mems" → "Home"

- `AppNavigator.tsx`: change the meetings tab label from "Mems" to "Home". Nav label only — the in-screen "Mems" heading stays as the brand term for recordings.

## Feature 5 — Photo capture + on-device vision analysis

**Capture (`MeetingDetailScreen.tsx`)**
- After the Transcript section, add an **"Attach photo"** action using `expo-image-picker` (camera or library). Persist the image into app storage (file URI).

**Storage (`src/db/schema.ts`)**
- New table `meeting_attachments`:
  - `id TEXT PRIMARY KEY`
  - `meeting_id TEXT` (FK → meetings.id)
  - `uri TEXT` (local file path)
  - `analysis TEXT NULL` (AI description; null until analysis completes)
  - `status TEXT` (`'analyzing' | 'done' | 'error'`)
  - `created_at INTEGER`
- Accessors: `getAttachments(meetingId)`, `addAttachment(...)`, `updateAttachmentAnalysis(id, analysis, status)`, `deleteAttachment(id)`.

**Vision wrapper (`src/qvac/vision.ts`)**
- New wrapper mirroring `summarize.ts`/`extract.ts` structure: `analyzeImage(uri, onToken?) → Promise<string>`.
- Loads a QVAC **multimodal** model, calls `completion({ history: [{ role: 'user', content: <prompt>, attachments: [{ path: barePath(uri) }] }], modelId })`, streams tokens, then unloads. Follows the load → infer → unload discipline.
- Prompt instructs the model to: read any handwritten/printed text verbatim **and** describe the scene (people, place, objects) — so it works for paper notes *and* general photos.
- Model: **`QWEN3VL_2B_MULTIMODAL_Q4_K`** + its `MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K` projector (registered in `src/qvac/models.ts`). Fallback `MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0` if memory-constrained on device.
- `barePath()` (from `stt.ts`) strips `file://` for the QVAC loader.

**UI section (`MeetingDetailScreen.tsx`)**
- New **"Photos"** section (separate from Summary — analysis never merges into the summary): each attachment renders a thumbnail + its AI description, with a per-photo status (analyzing spinner / done / error + retry). Long-press or a delete affordance removes an attachment.
- Analysis runs after capture; while it runs, only the vision model is resident (no other model loaded concurrently).

**Risks / verify during implementation**
- Confirm the prebuilt `qvac/worker.bundle.js` includes the multimodal completion plugin (`PLUGIN_LLM` with mmproj support). If absent, the worker bundle must be rebuilt to include it — flag before relying on device inference.
- Confirm `loadModel` association of the `MMPROJ_*` projector with the base multimodal model (registry auto-association vs. explicit option) — verify against `@qvac/sdk` on first device run.
- Memory: 2B Q4 multimodal must load alone on iPhone 14 Pro; everything else unloaded first (existing discipline already enforces this).

---

## Data flow summary

- **Agent:** user input → `appendAgentMessage(user)` → `ask()` (unchanged) → `appendAgentMessage(assistant + citations)` → re-render persisted transcript.
- **Vision:** capture → `addAttachment(status:'analyzing')` → `vision.analyzeImage(uri)` (load VLM → stream → unload) → `updateAttachmentAnalysis(done)` → render in Photos section.

## Testing

Follow the repo pattern (pure logic unit-tested against `__mocks__/`, device boundary mocked):
- `agent_messages` + `meeting_attachments` DB accessors: unit tests via the `expo-sqlite` mock.
- `vision.ts` prompt-building / parsing helper (the pure part): unit test; add a `completion` mock entry that yields image-aware output. Native multimodal inference itself is device-only (tracked like other inference in `spike.md`).
- Existing tests must stay green (`npm test`).
- Manual device verification (iPhone 14 Pro): keyboard fix, agent history persistence across navigation, photo capture → analysis → display.

## File-change map

| Area | Files |
|---|---|
| Logo asset | `cortex/assets/qvac-logo.png` (new), generated from `qvac-logo.svg` |
| Home hero + logo | `cortex/src/screens/MeetingsScreen.tsx` |
| Keyboard fix + Agent UI | `cortex/src/screens/AskScreen.tsx` (→ Agent), |
| Nav labels + icon | `cortex/src/navigation/AppNavigator.tsx` |
| Agent + attachments storage | `cortex/src/db/schema.ts`, `cortex/src/db/*.ts` (accessors) |
| Vision wrapper | `cortex/src/qvac/vision.ts` (new), `cortex/src/qvac/models.ts` |
| Photos section + capture | `cortex/src/screens/MeetingDetailScreen.tsx` |
| Types | `cortex/src/types.ts` (AgentMessage, MeetingAttachment) |
| Deps | `expo-image-picker` (add) |
