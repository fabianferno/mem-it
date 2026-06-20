# QVAC Hackathon I — Unleash Edge AI

Compiled from the official DoraHacks page, official rules, and related QVAC/Tether resources.

**Source:** https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail  
**Rules:** https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/official-rules  
**Status as of 2026-06-21:** Submission deadline is today — June 21, 2026, 23:59 UTC.

---

## At a Glance

| Field | Detail |
|---|---|
| Name | QVAC Hackathon I - Unleash Edge AI |
| Organizer | QVAC team at Tether |
| Platform | DoraHacks (virtual) |
| Prize pool | 21,000 USD (paid in USDT) |
| Format | BYOH (Bring Your Own Hardware), month-long build |
| Build period | June 1 – June 21, 2026 |
| Core requirement | All inference must use `@qvac/sdk` |
| License | Apache 2.0 on GitHub (public during hackathon + reasonable period after) |
| Team size | Solo or team of up to 4 — one entry only, not both solo and on a team |
| Submissions | Private on DoraHacks (organizer setting) |

---

## Timeline

| Milestone | Date |
|---|---|
| Pre-registration opens | May 25, 2026 |
| Submission period opens | May 31, 2026 |
| Build period | June 1 – June 21, 2026 |
| **Submission deadline** | **June 21, 2026, 23:59 UTC** |
| Early bird bonus cutoff | Complete submissions before June 17, 2026 |
| Winner announcement | July 3, 2026 |

---

## What It Is About

The first official QVAC hackathon — a month-long event to prove that local-first, privacy-preserving, decentralized AI is production-ready today.

Using the QVAC SDK (single cross-platform JS API for on-device inference, RAG, P2P model sharing, delegated compute, fine-tuning, and multimodal capabilities), build real applications that run entirely on consumer hardware (phones, laptops, SBCs) with zero cloud dependencies.

This is not a generic AI hackathon. Organizers want public demonstrations — by the community — that edge AI powered by QVAC can deliver privacy, speed, resilience, and cost savings that outmatch centralized providers.

---

## Why Participate

- Win USDT on the global podium (1st to 3rd place)
- Win in one of four tracks even without reaching the global podium
- Build in Public category with its own USDT prize
- Build something shippable with no vendor lock-in and no API bills
- Direct exposure to the QVAC/Tether team and potential partnerships
- Contribute to the open local-AI ecosystem
- Featured in the official QVAC community portfolio

---

## Prize Structure

**Total pool:** 21,000 USD (USDT)

### Global Podium

| Place | Prize |
|---|---|
| 1st | 5,000 USDT / team |
| 2nd | 3,500 USDT / team |
| 3rd | 2,000 USDT / team |

### Track Winners (×4 tracks)

| Place | Prize |
|---|---|
| 1st per track | 1,500 USDT / team |
| Honorable mention | 800 USDT / team |

### Build in Public

| Category | Prize |
|---|---|
| Most social team | 1,500 USDT |

Projects are evaluated for both the global podium and each track they enter.

**Build in Public page:** https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/build-in-public!

---

## Tracks

**Tracks page:** https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/tracks

Participate in one or more tracks. If multiple devices run inference, the highest-capacity device counts as the main one for track classification.

### 1. General Purpose Devices

- **Hardware:** Retail devices up to 32 GB RAM (laptops, desktops, workstations, high-end mini-PCs)
- **Vibe:** Ambitious, production-grade apps pushing retail hardware limits
- **Focus areas:**
  - Complex multi-agent systems with orchestration and tool calling
  - Multimodal apps (vision + text + audio)
  - Advanced RAG pipelines with large document collections
  - Real-time apps combining local inference with P2P delegation
  - Fine-tuning / LoRA adaptation using QVAC Fabric on consumer GPUs
  - Privacy-first enterprise tools (local document intelligence, support agents, knowledge bases)

### 2. Tinkerer

- **Hardware:** SBCs and low-power edge devices with ≤ 4 GB RAM (Raspberry Pi 4/5, Orange Pi, Rock Pi, etc.)
- **Vibe:** Maximum impact with minimum resources
- **Focus areas:**
  - Ultra-lightweight model combinations
  - Creative P2P delegation (phone → SBC → desktop meshes)
  - Offline-first IoT / robotics / monitoring agents
  - Battery-powered or solar-powered AI nodes
  - Edge sensor fusion + local inference (CV on Pi, voice assistants, environmental monitors)
  - Making small models (1B–3B) useful via prompting, RAG, or tool use
- **Goal:** Prove local AI is accessible even on a $50–$150 device.

### 3. Mobile

- **Hardware:** Retail smartphones and tablets only (Android or iOS). No custom/industrial/embedded boards.
- **Vibe:** Delightful, private AI in your pocket
- **Focus areas:**
  - Personal AI assistants that work completely offline
  - Health/wellness apps using on-device MedPsy or other models
  - Multimodal mobile experiences (photo → analysis, voice → action)
  - Privacy-first alternatives to cloud apps (notes, travel, translation, tutors)
  - QVAC SDK + mobile sensors (camera, mic)
  - P2P delegation where phone offloads heavy tasks to laptop/desktop
- **Goal:** Show flagship and mid-range phones can deliver production-quality AI without sending data to the cloud. Bonus for beautiful UX and daily-life utility.

### 4. Our Psy Models

- **Hardware:** Any form factor (General Purpose, Tinkerer, or Mobile)
- **Vibe:** Meaningful use of QVAC models locally, especially MedPsy
- **Example use cases:**
  - Private on-device health assistants
  - Medical document analysis / RAG over personal health records
  - Symptom checkers or patient-education tools
  - Wearable integration for local trend analysis
  - Clinical decision support aids (research/education only)
  - Creative combinations with other QVAC modalities (voice, vision)
- **Goal:** Highlight MedPsy's strong reasoning at small sizes. Show high-quality medical intelligence can run privately on user devices.

> **Disclaimer:** Medical tools may face laws, licensing, and compliance risks. Hackathon selection is not legal or licensing advice.

---

## Eligibility & Participation Rules

- Open to anyone meeting the [Terms of Participation](https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail) eligibility requirements
- **One entry only** — solo or as a team of up to 4, not both
- Cannot be a member of multiple teams
- Register via DoraHacks; subject to [DoraHacks Terms of Use](https://dorahacks.io/legal/terms) and [Privacy Policy](https://dorahacks.io/legal/privacy)
- Project must be created on DoraHacks with all team members listed on the project page
- Join the Discord community (linked from hackathon page)

---

## Hard Constraints (Non-Negotiables)

- **All inference** must use the QVAC SDK (`@qvac/sdk`) — including embeddings, RAG, multimodal, TTS/STT, and related workloads
- May additionally use QVAC Fabric (fine-tuning), Genesis datasets, and MedPsy models
- **No cloud APIs** for AI workloads; optional non-AI cloud services allowed only if clearly disclosed
- **No cluster inference** — multi-GPU inference clusters are not allowed, even on your own private cloud
- **BYOH:** Use whatever hardware you have (phone, laptop, Raspberry Pi, etc.)
- **Open source:** Public GitHub repo under Apache 2.0 during the hackathon and for a reasonable period after
- **Evidence bundle** required for the 3-stage verification process

---

## Technical Rules

You may use any programming language and framework, as long as:

- QVAC SDK is integrated meaningfully for all relevant workloads (completion, embeddings/RAG, multimodal, tool calling, P2P/delegated inference, etc.)
- Submission includes clear instructions to run or test the project
- All third-party services, APIs, or pre-built components are disclosed
- Project is straightforward for judges to evaluate: clear setup, runnable out-of-the-box on declared hardware

---

## Submission Requirements

**Submit BUIDL:** https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail

### Required Artifacts

| Requirement | Detail |
|---|---|
| Public GitHub repo | Accessible to judges; Apache 2.0 licensed |
| Demo video | YouTube **unlisted**, max 5 minutes; link in submission form |
| Performance log | Structured format (CSV, JSON, etc.): model loads/unloads, inference metrics (prompt, tokens, TTFT, tokens/sec) for a standard demo run |
| Hardware specs | CPU, GPU, RAM, storage for all demo devices; include system profiler screenshots |
| API disclosure file | Structured file (JSON, XML, YAML, etc.) listing every remote API call the project uses |
| Track selection | Declare which track(s) you are entering |
| DoraHacks BUIDL | Project created on DoraHacks; all team members added |
| Prior work disclosure | Clearly disclose any pre-existing code; judging focuses on work completed during the hackathon period |

### Submission Form Fields

- Product name and description
- Team hashtag (if participating in Build in Public)
- Teammate list with background and prior experience
- Team location
- Track(s) entered
- Public GitHub repo link(s)
- Reproducibility instructions

---

## Validation and Winner Selection

3-stage verification built around an evidence framework for transparency and honesty:

| Stage | What happens |
|---|---|
| Stage 1 | Static analysis of the repository |
| Stage 2 | Artifact and artifact consistency review |
| Stage 3 | Potential live action defined per project by the evaluation team |

Projects compete for the global podium and each track they enter. Community voting on Discord and Keet is also considered.

---

## How Projects Are Judged

Projects meeting mandatory requirements are evaluated by a Tether judge panel using weighted scoring. Best projects demonstrate production-ready, local-first AI on real consumer hardware.

### Mandatory Requirements

- Must use QVAC SDK for all AI inference and RAG
- Follow participant/hardware constraints of entered track(s)
- Include full reproducibility instructions and hardware setup
- Submit complete artifacts (logs, demo video, hardware proof, etc.)

### Evaluation Criteria

Holistic evaluation emphasizing real local/on-device performance, creativity, real-world relevance, and production-grade architecture. Polish helps, but strong technical decisions and impressive results matter more than UI/UX alone.

| Criterion | What judges look for |
|---|---|
| Early bird bonus | Complete submissions before June 17 |
| Innovation | Novel edge/P2P AI applications |
| Capabilities | Multi-agent workflows with orchestration and tool calling |
| Artifact quality | Consistency of logs, resources, and demo |
| Performance | Optimization, P2P load distribution, constrained-device handling, speed & reliability |
| Complexity & UX | Advanced features and real-world usability |
| Model usage & coverage | Creative use of Psy models (MedPsy, etc.) |
| QVAC usage | Strong use of QVAC stack (models, datasets, fine-tuning, app integrations) |
| Impact & market relevance | Practical use cases for real businesses/products |
| Originality | Novel edge/P2P applications, UX, security (prompt injection resistance) |
| Awareness | Social posting about the hackathon per guidelines |
| Social engagement | Build in Public participation |
| Community vote | Discord and Keet social vote during evaluation period |

---

## Build in Public

**Prize:** 1,500 USDT for the most social team.

Follow @QVAC on X. More info: https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/build-in-public!

### How to Participate

1. Define a team hashtag (e.g. `#teamPrime`)
2. Tag @QVAC on X using your hashtag; more engagement = more points
3. Put your hashtag in the submission form

### Levels

| Level | Action |
|---|---|
| Level 1 | Post on X about joining; tag @QVAC with your hashtag |
| Level 2 | Weekly progress updates while building |
| Level 3 | Video progress updates (archive live streams for validation) |

Share your authentic journey: challenges, breakthroughs, optimizations, prompts, bugs, aha moments.

---

## QVAC SDK Quick Reference

**Package:** `@qvac/sdk` (npm)

```bash
npm install @qvac/sdk
```

```js
import { loadModel, completion, unloadModel } from "@qvac/sdk";

const modelId = await loadModel({ modelType: "llm" });
const response = completion({
  modelId,
  history: [{ role: "user", content: "Your prompt" }],
});
const text = await response.text;
await unloadModel({ modelId });
```

### SDK Capabilities

- LLM completion / chat
- Text embeddings
- RAG (retrieval-augmented generation)
- Fine-tuning (LoRA via Fabric)
- Multimodal (text, images, other media)
- Image generation (diffusion)
- Video generation (diffusion)
- Transcription / ASR (Whisper, Parakeet)
- Text-to-speech
- Voice assistant pipeline
- Translation
- VLA (vision-language-action for robotics)
- OCR
- Image classification
- P2P model sharing and delegated inference
- OpenAI-compatible HTTP server

### Runtimes and Platforms

| | |
|---|---|
| **Runtimes** | Node.js, Bare runtime, Expo |
| **Platforms** | Linux, macOS, Windows, Android, iOS |
| **License** | Apache 2.0 |

---

## Ecosystem and Related Tech

| Entity | Role |
|---|---|
| QVAC | Local-first AI SDK and platform by Tether |
| Tether | Parent org |
| Holepunch | P2P stack (Hyperswarm, Bare runtime) |
| WDK | Wallet Development Kit (agents can transact with Bitcoin/USDT) |
| Fabric LLM | Hardware-agnostic LLM engine (Vulkan); supports LoRA fine-tuning on mobile |
| MedPsy | QVAC medical/healthcare models (1.7B, 4B, GGUF variants) |
| Genesis | Synthetic pre-training datasets (148B tokens for STEM/logic) |
| Workbench | Flagship desktop/mobile QVAC app |
| Health | Local health tracking app |

**Hackathon tags on DoraHacks:** AI, Edge Computing, Mobile, Open Source, Privacy, Frontier Tech, Platform technology, QVAC, WDK, Holepunch, Tether

---

## Key Links

| Resource | URL |
|---|---|
| Hackathon (main) | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail |
| Official rules | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/official-rules |
| Tracks | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/tracks |
| Build in Public | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/build-in-public! |
| Q&A / teammates | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/qa |
| Submit BUIDL | https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail |
| QVAC website | https://qvac.tether.io/ |
| QVAC docs | https://docs.qvac.tether.io/ |
| SDK getting started | https://docs.qvac.tether.io/sdk/getting-started/ |
| Quickstart | https://docs.qvac.tether.io/quickstart/ |
| LLM docs export | https://docs.qvac.tether.io/llms-full.txt |
| GitHub repo | https://github.com/tetherto/qvac |
| npm package | https://www.npmjs.com/package/@qvac/sdk |
| QVAC models | https://qvac.tether.io/models/ |
| Hugging Face org | https://huggingface.co/qvac |
| MedPsy collection | https://huggingface.co/collections/qvac/medpsy |
| MedPsy-1.7B | https://huggingface.co/qvac/MedPsy-1.7B |
| MedPsy-4B | https://huggingface.co/qvac/MedPsy-4B |
| X / Twitter | @QVAC |
| Community | Discord (linked from hackathon page); Keet P2P room (qvac.tether.io) |
| Terms of Participation | Linked from hackathon detail page |

---

## Legal Notice

This hackathon is for demonstration and innovation purposes only. Selection for a prize is not legal, licensing, or other advice, nor an endorsement by Tether. Teams looking to commercialize what they build must do their own diligence on compliance with laws and licensing requirements.

Tether and affiliates make no representations about and accept no liability for DoraHacks as a third-party platform.

---

## Our Submission — mem-it

### Product

**mem-it** — a fully on-device, privacy-first "second brain" for meetings. Record
a conversation; the app transcribes it (Whisper), extracts a knowledge graph +
action items and a summary (Llama 3.2 1B), embeds the transcript for recall
(GTE-large), grows a live 3D "brain graph", and answers questions over your past
meetings with local RAG. **No audio, transcript, or derived data ever leaves the
phone** — all inference runs through `@qvac/sdk`.

### Track declaration

- **Primary track: Mobile** — retail iPhone, 100% on-device inference, daily-life
  utility, beautiful UX.
- Not entering General Purpose or Tinkerer (mobile-only target).
- Not entering "Our Psy Models" — mem-it does not use MedPsy (general meeting
  intelligence, not a health/medical tool).

### Team

- **Hardware available:** iPhone 14 Pro (A16, 6 GB RAM, iOS 16.4+) — see `HARDWARE.md`
- **Preferred track(s):** Mobile
- **Team hashtag (Build in Public):** <!-- TODO: set X hashtag, e.g. #teamMemit -->

### QVAC usage

| Capability | Used | Where |
|---|---|---|
| LLM completion (streaming) | ✅ | summary + action items, graph extraction, RAG answer |
| Tool calling / orchestration | ✅ | Recall agent routes to `search_memory` / `list_todos`, then answers |
| Transcription / ASR (Whisper) | ✅ | meeting → transcript |
| Text embeddings | ✅ | transcript chunks + RAG query (GTE-large, 1024-dim) |
| RAG | ✅ | embed query → cosine top-k → grounded, streamed answer with citations |
| Prompt-injection resistance | ✅ | untrusted transcript/context fenced + instruction hierarchy (`safety.ts`) |
| P2P memory sharing (AirDrop) | ✅ | export `.memit` bundle → AirDrop → import-merge into recipient's graph + RAG, fully offline (`src/share/`) |
| Model lifecycle + profiler | ✅ | sequential load/infer/unload; per-model perf log (load/TTFT/tok-s) |
| App suspend/resume + cancel | ✅ | QVAC suspended on background; in-flight inference cancellable |

### Submission artifacts checklist

- [x] Public GitHub repo (https://github.com/fabianferno/wack)
- [x] Apache 2.0 `LICENSE` (root + `cortex/`)
- [x] Reproducibility instructions (`cortex/README.md`)
- [x] Prior work disclosure (pivot from Obscura — `cortex/README.md`)
- [x] API disclosure file (`API_DISCLOSURE.json`)
- [x] Hardware specs doc (`HARDWARE.md`)
- [x] Performance log instrumentation (`src/perf/perfLog.ts` → `memit-perf-*.json`)
- [x] Build-in-Public content drafted (`BUILD_IN_PUBLIC.md`)
- [x] README benchmark table scaffold (`cortex/README.md` — fill from device run)
- [x] Submission write-up (`SUBMISSION.md` — one-liner, description, QVAC usage)
- [x] Demo video script (`demo-script.md`)
- [x] Build installed + running on iPhone 14 Pro (iOS 26.5)
- [ ] **Record the demo video** following `demo-script.md` (≤5 min, YouTube unlisted)
- [ ] **Performance log sample** from a real device run (commit under `evidence/`)
- [ ] **Hardware/system-profiler screenshots** (commit under `evidence/`)
- [ ] **Demo video** (YouTube unlisted, ≤5 min) — add link to submission form
- [ ] **DoraHacks BUIDL** created with all team members
- [ ] Device verification complete (`cortex/spike.md` tasks 1–6)

### Open Questions

- Team hashtag for Build in Public?
- Final OS build / storage figures for `HARDWARE.md`?
