# Build in Public — mem-it

Drafts for the QVAC Hackathon "Build in Public" prize (Awareness + Social
engagement + Community-vote criteria). Follow [@QVAC](https://x.com/QVAC) on X
first. Replace the placeholders, then post.

- **Team hashtag:** `#teamMemit` <!-- change if you prefer another -->
- **Repo:** https://github.com/fabianferno/wack
- **Demo video:** <!-- TODO: YouTube unlisted link -->

---

## X — launch thread

**1/**
We built **mem-it**: a private "second brain" for your meetings that runs
100% on your iPhone. Record → transcribe → knowledge graph → ask it anything.
No cloud. Nothing leaves the device. Powered by @QVAC. #teamMemit 🧠🔒

🎥 <!-- demo video link -->
💻 https://github.com/fabianferno/wack

**2/**
Why on-device? Your meetings are your most sensitive data — salaries, strategy,
health, deals. mem-it never uploads a byte. Every model (Whisper, Llama 3.2,
GTE embeddings) runs locally through the @QVAC SDK. #teamMemit

**3/**
The hard part is memory discipline. A phone can't hold three models at once, so
mem-it runs a strict load → infer → unload pipeline: exactly one model resident
at a time. We log every load/unload, TTFT, and tokens/sec. #teamMemit

**4/**
Recall isn't plain RAG — it's a tiny on-device agent. It picks a tool
(search your transcripts vs. list your action items), then answers with
citations, streaming token-by-token. Tool calling on a 1B model, on a phone. ⚡
#teamMemit

**5/**
We hardened it against prompt injection too. Anyone in a meeting could say
"ignore your instructions…" — that text is fenced as untrusted data and never
obeyed. Local AI can still be safe AI. #teamMemit

**6/**
And the fun part: a live 3D "brain graph" that grows as the model streams
entities, with the same concept merging across meetings by cosine similarity.
Your knowledge, literally connecting itself. #teamMemit

**7/**
Built for the @QVAC Unleash Edge AI hackathon. Open source (Apache 2.0).
If edge AI excites you, star the repo and tell us what you'd record first 👇
https://github.com/fabianferno/wack #teamMemit

---

## X — single launch post (if not threading)

mem-it 🧠 — a private second brain for your meetings, 100% on your iPhone.
Record → transcribe → 3D knowledge graph → ask it anything. No cloud, nothing
leaves your device. On-device agent + prompt-injection hardened. Powered by
@QVAC. Open source 👇 #teamMemit
https://github.com/fabianferno/wack

---

## Discord (QVAC community)

👋 Shipped **mem-it** for the hackathon — a fully on-device meeting second brain
on the QVAC SDK (Mobile track, iPhone 14 Pro).

- Whisper STT → Llama 3.2 1B (summary + knowledge-graph extraction) → GTE
  embeddings → local RAG, strict one-model-in-memory pipeline.
- Recall is a minimal tool-calling agent (search_memory / list_todos) with
  streaming answers + citations.
- Prompt-injection defense on all untrusted transcript/context.
- Live 3D brain graph that merges concepts across meetings.

Repo: https://github.com/fabianferno/wack · Demo: <!-- link -->
Feedback very welcome 🙏 #teamMemit

---

## Keet (P2P room)

mem-it — private, on-device meeting second brain built on QVAC. Transcribe +
knowledge graph + local RAG agent, nothing leaves the phone. Demo + repo inside.
#teamMemit

---

## Posting cadence (Build-in-Public levels)

- **Level 1 (done at launch):** announce joining, tag @QVAC + hashtag.
- **Level 2:** weekly progress — pipeline, memory discipline, the agent, the
  injection defense, perf numbers from a real device run.
- **Level 3:** a short screen-recording / livestream of a full
  record → recall flow in airplane mode (the strongest proof it's all local).
