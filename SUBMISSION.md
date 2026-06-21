# mem-it — QVAC Hackathon Submission

## One-liner

**mem-it is a private "second brain" for your meetings that runs entirely on your
iPhone — record, transcribe, build a knowledge graph, and ask it anything, with
zero cloud and nothing ever leaving the device.**

![mem-it app screenshots](https://raw.githubusercontent.com/fabianferno/mem-it/main/screenshots.png)

## Short description (for the form)

mem-it records a meeting and, fully on-device via Tether's `@qvac/sdk`,
transcribes it (Whisper), extracts a knowledge graph + action items + a summary
(Llama 3.2 1B), embeds it for retrieval (GTE-large), and grows a live 3D "brain
graph" where the same concept merges across meetings. You can also snap a photo —
paper notes, a whiteboard, a place — and an on-device vision model (Qwen3-VL 2B)
reads and describes it, attaching the analysis to the meeting. The **Agent** tab
is a small on-device agent that tool-calls between your transcripts and your
action items and answers with streaming citations over a persistent conversation.
It's hardened against prompt injection, and you can AirDrop a meeting to another
iPhone where it merges into their brain — peer-to-peer, offline, no server.

## Track

- **Primary: Mobile** — retail iPhone 14 Pro, 100% on-device inference.
- Not entering General Purpose / Tinkerer (mobile-only target).
- Not entering "Our Psy Models" (general meeting intelligence, not medical).

## Why it matters

Your meetings are your most sensitive data — strategy, salaries, deals, health.
Every cloud notetaker uploads all of it. mem-it proves you don't have to: a
flagship phone can transcribe, reason over, and recall your conversations with
**no network dependency at all**. Put it in airplane mode and it still works.

## What's novel

- **On-device agent, not just RAG** — the Agent routes between tools
  (`search_memory` over transcripts, `list_todos` over the action-items table),
  then answers grounded in the result, streaming token-by-token with citations,
  over a persisted conversation. Tool calling on a 1B model, on a phone.
- **On-device multimodal vision** — attach a photo of paper notes, a whiteboard,
  a place, or people; Qwen3-VL 2B reads any text verbatim and describes the scene,
  entirely on-device (the SDK loads the VLM + its mmproj projector, infers, then
  unloads). The result is stored in the meeting's Photos section — never uploaded,
  never merged into the summary.
- **Live 3D knowledge graph** — entities stream into a force-directed 3D graph as
  the model generates them, and the same concept merges across meetings by
  similarity, so your knowledge literally connects itself.
- **Prompt-injection hardened** — transcripts/context are untrusted (a meeting
  attendee can say "ignore your instructions…"); that text is fenced as data with
  an instruction hierarchy and forged markers are stripped, so it's never obeyed.
- **AirDrop a memory (P2P, offline)** — export a meeting as a portable `.memit`
  bundle (with its chunk embeddings + graph subgraph) and AirDrop it to a
  teammate; it merges into *their* brain graph and RAG index by label. No cloud.
- **Strict memory discipline** — exactly one QVAC model resident at a time
  (load → infer → unload), with every load/unload, TTFT, and tokens/sec logged.

## QVAC usage

| Capability | Where |
|---|---|
| LLM completion (streaming) | summary + action items, graph extraction, Agent answer |
| Tool calling / orchestration | Agent routes to `search_memory` / `list_todos` |
| Transcription / ASR (Whisper) | meeting audio → transcript |
| Text embeddings | transcript chunks + RAG query (GTE-large, 1024-dim) |
| Multimodal vision (image → text) | attached photo → on-device description/OCR (Qwen3-VL 2B + mmproj) |
| RAG | embed → cosine top-k → grounded, streamed answer with citations |
| Prompt-injection resistance | `src/qvac/safety.ts` (data fencing + instruction hierarchy) |
| Model lifecycle + profiler | sequential load/infer/unload; per-model perf log |
| App suspend/resume + cancel | QVAC suspended on background; inference cancellable |

**Models:** `WHISPER_SMALL_Q8_0` (STT) · `LLAMA_3_2_1B_INST_Q4_0` (LLM) ·
`GTE_LARGE_FP16` (embeddings, 1024-dim) · `QWEN3VL_2B_MULTIMODAL_Q4_K` +
`MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K` (on-device image analysis, loaded only when a
photo is attached).

## Architecture (one model in memory at a time)

Everything runs in-process on the phone. The pipeline is **strictly sequential —
exactly one QVAC model resident in memory at any moment** (load → infer → unload),
which is what keeps a flagship phone inside its RAM budget while doing the work of
a cloud notetaker.

### System overview

![System overview][system-overview-diagram]

### Recording pipeline (sequential — load → infer → unload)

![Recording pipeline][recording-pipeline-diagram]

The user sees transcript + summary as soon as they're ready (`onReviewReady`),
while the slower graph-extraction and embedding stages keep running. Cancellation
is checked at every stage boundary.

### Agent (on-device tool calling, persistent conversation)

![Agent][recall-agent-diagram]

### Peer-to-peer sharing (offline, no server)

![Peer-to-peer sharing][peer-to-peer-sharing-diagram]

Embeddings are stored as Float32 BLOBs; cosine similarity is computed in JS (no
vector DB). Graph nodes merge across meetings by cosine (threshold 0.82) and by
normalized label, so the same concept densifies the graph over time. The 3D graph
is `3d-force-graph`/three.js hosted in a WebView.

## How to run

```bash
cd cortex
npm install
npx expo install expo-audio expo-sqlite react-native-webview expo-sharing expo-document-picker expo-image-picker
npm run bundle:graph
npm run ios            # real device required; iPhone 14 Pro, A16
npm test               # 56 unit tests, no device needed
```

First launch downloads the three QVAC models, then runs fully offline. A
structured performance log (`memit-perf-*.json`) is written to the app document
directory after each recording.

## Hardware

iPhone 14 Pro (`iPhone15,2`), A16, 6 GB RAM, iOS 26.5 (build 23F77). Full specs
and evidence checklist in [`HARDWARE.md`](./HARDWARE.md).

## Artifacts

- **Repo:** https://github.com/fabianferno/mem-it (Apache 2.0)
- **Demo video:** https://canva.link/ea5wy6e447bajjm
- **API disclosure:** [`API_DISCLOSURE.json`](./API_DISCLOSURE.json) — no cloud AI; one-time model download + optional AirDrop only
- **Performance log:** `memit-perf-*.json` (from a device run; commit under `evidence/`)
- **Hardware proof:** screenshots per `HARDWARE.md` (commit under `evidence/`)
- **Build-in-Public:** [`BUILD_IN_PUBLIC.md`](./BUILD_IN_PUBLIC.md)

## Team

- **Members:** <!-- TODO: name(s), background, prior experience -->
- **Location:** <!-- TODO -->
- **Build-in-Public hashtag:** `#teamMemit` <!-- change if desired -->

## Reproducibility note

All inference is local through `@qvac/sdk`. No API keys, no accounts, no network
needed after the initial model download. Judges can verify the offline claim by
enabling airplane mode and running a full record → recall flow.

<!-- Diagram image references: GitHub raw URLs so pasted Markdown can load them. -->
[system-overview-diagram]: https://raw.githubusercontent.com/fabianferno/mem-it/main/docs/diagrams/system-overview.png
[recording-pipeline-diagram]: https://raw.githubusercontent.com/fabianferno/mem-it/main/docs/diagrams/recording-pipeline.png
[recall-agent-diagram]: https://raw.githubusercontent.com/fabianferno/mem-it/main/docs/diagrams/recall-agent.png
[peer-to-peer-sharing-diagram]: https://raw.githubusercontent.com/fabianferno/mem-it/main/docs/diagrams/peer-to-peer-sharing.png
