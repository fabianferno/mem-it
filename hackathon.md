QVAC Hackathon I - Unleash Edge AI
Compiled from the official DoraHacks page and related QVAC/Tether resources for brainstorming.
Source: https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail
Status as of 2026-06-13: ~8 days left until submission deadline.
At a Glance
Field
Detail
Name
QVAC Hackathon I - Unleash Edge AI
Organizer
QVAC team at Tether
Platform
DoraHacks (virtual)
Prize pool
21,000 USD (paid in USDT)
Format
BYOH (Bring Your Own Hardware), month-long build
Core requirement
All inference must use @qvac/sdk
License
Projects must be fully open source (MIT or Apache 2.0)
Timeline
Milestone
Date
Pre-registration opens
May 25, 2026
Submission period opens
May 31, 2026
Build period
June 1 - June 21, 2026
Submission deadline
June 21, 2026, 23:59 UTC
Early bird bonus cutoff
Complete submissions before June 14, 2026
Winner announcement
July 3, 2026
What It Is About
The first official QVAC hackathon. Goal: prove that local-first, privacy-preserving, decentralized AI is production-ready today.
Using the QVAC SDK (single cross-platform JS API), build real applications that run entirely on consumer hardware (phones, laptops, SBCs) with zero cloud dependencies.
This is not a generic AI hackathon. Organizers want public demonstrations that edge AI powered by QVAC can deliver privacy, speed, resilience, and cost savings that outmatch centralized providers.
Why Participate
Win USDT on the global podium (1st to 3rd place)
Win in one of four tracks even without reaching the global podium
Build in Public category with its own USDT prize
Build something shippable with no vendor lock-in and no API bills
Direct exposure to the QVAC/Tether team and potential partnerships
Contribute to the open local-AI ecosystem
Featured in the official QVAC community portfolio (per third-party summaries)
Prize Structure
Total pool: 21,000 USD (USDT)
Category
Details
Global Podium
1st, 2nd, 3rd place overall (USDT; exact amounts not listed on public detail page)
Track winners
4 tracks; each has a primary winner prize + possible honorable mention
Build in Public
1,500 USDT for the most social team (confirmed on Build in Public page)
Projects can be evaluated for both the global podium and any track(s) they enter.
Build in Public page: https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/build-in-public!
Tracks
Tracks page: https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/tracks
You can participate in one or more tracks. If multiple devices run inference, the highest-capacity device counts as the main one for track classification.
1. General Purpose Devices
Hardware: Retail devices up to 32 GB RAM (laptops, desktops, workstations, high-end mini-PCs)
Vibe: Ambitious, production-grade apps pushing retail hardware limits
Focus areas:
Complex multi-agent systems with orchestration and tool calling
Multimodal apps (vision + text + audio)
Advanced RAG pipelines with large document collections
Real-time apps combining local inference with P2P delegation
Fine-tuning / LoRA adaptation using QVAC Fabric on consumer GPUs
Privacy-first enterprise tools (local document intelligence, support agents, knowledge bases)
2. Tinkerer
Hardware: SBCs and low-power edge devices with <= 4 GB RAM (Raspberry Pi 4/5, Orange Pi, Rock Pi, etc.)
Vibe: Maximum impact with minimum resources
Focus areas:
Ultra-lightweight model combinations
Creative P2P delegation (phone -> SBC -> desktop meshes)
Offline-first IoT / robotics / monitoring agents
Battery-powered or solar-powered AI nodes
Edge sensor fusion + local inference (CV on Pi, voice assistants, environmental monitors)
Making small models (1B-3B) useful via prompting, RAG, or tool use
Goal: Prove local AI is accessible even on a $50-$150 device.
3. Mobile
Hardware: Retail smartphones and tablets only (Android or iOS). No custom/industrial/embedded boards.
Vibe: Delightful, private AI in your pocket
Focus areas:
Personal AI assistants that work completely offline
Health/wellness apps using on-device MedPsy or other models
Multimodal mobile experiences (photo -> analysis, voice -> action)
Privacy-first alternatives to cloud apps (notes, travel, translation, tutors)
QVAC SDK + mobile sensors (camera, mic)
P2P delegation where phone offloads heavy tasks to laptop/desktop
Goal: Show flagship and mid-range phones can deliver production-quality AI without sending data to the cloud. Bonus for beautiful UX and daily-life utility.
4. Our Psy Models
Hardware: Any form factor (General Purpose, Tinkerer, or Mobile)
Vibe: Meaningful use of QVAC models locally, especially MedPsy
Example use cases:
Private on-device health assistants
Medical document analysis / RAG over personal health records
Symptom checkers or patient-education tools
Wearable integration for local trend analysis
Clinical decision support aids (research/education only)
Creative combinations with other QVAC modalities (voice, vision)
Goal: Highlight MedPsy's strong reasoning at small sizes. Show high-quality medical intelligence can run privately on user devices.
Disclaimer: Medical tools may face laws, licensing, and compliance risks. Hackathon selection is not legal or licensing advice.
Hard Constraints (Non-Negotiables)
All inference must use the QVAC SDK (@qvac/sdk)
Join the Discord community (linked from hackathon page)
Fully open source (MIT or Apache 2.0) with clear README + reproducibility instructions
Evidence bundle required for the 3-stage verification process
BYOH: Use whatever hardware you have (phone, laptop, Raspberry Pi, etc.)
No cluster inference: Running inference on a cluster, even your own private cloud, is not allowed
No cloud dependencies for the core AI workload (zero cloud inference)
Technical Rules (from official rules)
You may use any programming language and framework, as long as:
QVAC SDK is integrated meaningfully for all relevant workloads (completion, embeddings/RAG, multimodal, tool calling, P2P/delegated inference, etc.)
Submission includes clear instructions to run or test the project
All third-party services, APIs, or pre-built components are disclosed
Submission Requirements
Requirement
Detail
Repo link
GitHub / GitLab / Bitbucket (required)
Demo video
Required; max 5 minutes
Performance log
Auditable structured log (CSV, JSON, etc.) with model loads/unloads and inference metrics (prompt, tokens, TTFT, tokens/sec) for a standard demo run
Track selection
Declare which track(s) you are entering
DoraHacks BUIDL
Project must be created on DoraHacks; all team members added to the project page
Build in Public hashtag
Optional; place team hashtag in submission form if participating
Submit BUIDL: https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail
Submissions are currently private on DoraHacks (organizer setting).
Validation and Winner Selection
3-stage verification built around an evidence framework for transparency and honesty:
Stage
What happens
Stage 1
Static analysis of the repository
Stage 2
Artifact and artifact consistency review
Stage 3
Potential live action defined per project by the evaluation team
Evaluation Criteria
Holistic evaluation. Emphasis on real local/on-device performance, creativity, real-world relevance, and production-grade architecture. Polish helps, but strong technical decisions and impressive results matter more than UI/UX alone.
Criterion
What judges look for
Technical execution and performance
Quality, optimization, TTFT/TPS on target hardware, P2P/delegated inference
Innovation and model creativity
Creative model combinations pushing edge AI boundaries
QVAC usage
Strong use of QVAC stack (models, datasets, fine-tuning, app integrations)
Artifact quality and verification
Consistency of logs, video, and hardware claims
Impact and market relevance
Practical use cases for real businesses/products
Originality
Novel edge/P2P applications, UX, security (prompt injection resistance)
Awareness
Social posting about the hackathon per guidelines
Early bird
Bonus for complete submissions before June 14
Community vote
Social vote on Discord and Keet considered as a factor
Projects compete for the global podium and each track they enter.
Build in Public
Prize: 1,500 USDT for the most social team.
How to participate:
Define a team hashtag (e.g. #teamPrime)
Tag @QVAC on X using your hashtag; more engagement = more points
Put your hashtag in the submission form
Levels:
Level
Action
Level 1
Post on X about joining; tag @QVAC with your hashtag
Level 2
Weekly progress updates while building
Level 3
Video progress updates (archive live streams for validation)
Share authentic journey: challenges, breakthroughs, optimizations, prompts, bugs, aha moments.
QVAC SDK Quick Reference
Package: @qvac/sdk (npm)
npm install @qvac/sdk
import { loadModel, completion, unloadModel } from "@qvac/sdk";
const modelId = await loadModel({ modelType: "llm" });
const response = completion({
  modelId,
  history: [
    { role: "user", content: "Your prompt" }
  ],
});
const text = await response.text;
await unloadModel({ modelId });
SDK Capabilities
LLM completion / chat
Text embeddings
RAG (retrieval-augmented generation)
Fine-tuning (LoRA via Fabric)
Multimodal (text, images, other media)
Image generation (diffusion)
Video generation (diffusion)
Transcription / ASR (Whisper, Parakeet)
Text-to-speech
Voice assistant pipeline
Translation
VLA (vision-language-action for robotics)
OCR
Image classification
P2P model sharing and delegated inference
OpenAI-compatible HTTP server
Runtimes and Platforms
Runtimes: Node.js, Bare runtime, Expo
Platforms: Linux, macOS, Windows, Android, iOS
License: Apache 2.0
Ecosystem and Related Tech
Entity
Role
QVAC
Local-first AI SDK and platform by Tether
Tether
Parent org
Holepunch
P2P stack (Hyperswarm, Bare runtime)
WDK
Wallet Development Kit (agents can transact with Bitcoin/USDT)
Fabric LLM
Hardware-agnostic LLM engine (Vulkan); supports LoRA fine-tuning on mobile
MedPsy
QVAC medical/healthcare models (1.7B, 4B, GGUF variants)
Genesis
Synthetic pre-training datasets (148B tokens for STEM/logic)
Workbench
Flagship desktop/mobile QVAC app
Health
Local health tracking app
Hackathon tags on DoraHacks: AI, Edge Computing, Mobile, Open Source, Privacy, Frontier Tech, Platform technology, QVAC, WDK, Holepunch, Tether
Key Links
Resource
URL
Hackathon (main)
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail
Official rules
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/official-rules
Tracks
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/tracks
Build in Public
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/build-in-public!
Q&A / teammates
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/qa
Submit BUIDL
https://dorahacks.io/hackathon/qvac-unleach-edge-ai-i/detail
QVAC website
https://qvac.tether.io/
QVAC docs
https://docs.qvac.tether.io/
SDK getting started
https://docs.qvac.tether.io/sdk/getting-started/
Quickstart
https://docs.qvac.tether.io/quickstart/
LLM docs export
https://docs.qvac.tether.io/llms-full.txt
GitHub repo
https://github.com/tetherto/qvac
npm package
https://www.npmjs.com/package/@qvac/sdk
QVAC models
https://qvac.tether.io/models/
Hugging Face org
https://huggingface.co/qvac
MedPsy collection
https://huggingface.co/collections/qvac/medpsy
MedPsy-1.7B
https://huggingface.co/qvac/MedPsy-1.7B
MedPsy-4B
https://huggingface.co/qvac/MedPsy-4B
X / Twitter
@QVAC
Community
Discord (linked from hackathon page); Keet P2P room (qvac.tether.io)
Brainstorming Notes (empty - fill in next)
Team
Hardware available:
Preferred track(s):
Team hashtag (Build in Public):
Idea candidates
Track fit check
Idea
General Purpose
Tinkerer
Mobile
Psy Models
Open questions
