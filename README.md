<div align="center">

# Before AI

### Think before the machine does.

**Before AI turns the wait for an AI response into a prediction round about your own prompt.**

Built for **Commons — "Make Waiting for AI Fun."**

[Live Demo](#) · [Product Spec](./PRODUCT_SPEC.md) · [Architecture](./ARCHITECTURE.md) · [Plan](./DEVELOPMENT_PLAN.md)

</div>

---

> **Status: core loop complete.** Prompt → contextual challenge → prediction + confidence → Commitment Gate → reveal → AI grading with a verified evidence quote → Brier score → calibration profile and local history. Sections marked _TODO_ are filled in on Day 15.

## The idea

Every AI interaction has a moment nobody uses: the seconds between hitting enter and seeing the answer. It's the last moment you still have your *own* opinion about the question — because once the answer lands, it overwrites whatever you thought.

Before AI captures that moment.

You send a prompt. The real request starts immediately. While it runs, a fast model reads your prompt and builds a prediction challenge *about that prompt* — what will the AI blame? what will it recommend? what will it conclude? You commit to an answer and a confidence level.

Then the answer arrives, and you find out.

## What makes it different

**The challenge is always about your prompt.** Ask why your `useEffect` fires twice, and you're asked what the AI will blame — with four causes that are all genuinely plausible. It's not a mini-game bolted onto a spinner.

**The Commitment Gate.** The answer streams in and is deliberately withheld until you lock your prediction. Faster models make this *better*, not worse — the answer is already warm when you commit. And a prediction made after seeing the answer isn't a prediction.

**Calibration, not accuracy.** Brier-style scoring rewards knowing what you know. Being 95% sure and wrong costs more than being 50% sure and wrong. The headline stat is your **Overconfidence Index** — how much more you trust yourself than you should.

**Nothing is faked.** The progress meter counts real tokens. The reasoning ticker shows the model's real (summarized) thinking. There is no artificial delay anywhere in the product.

## How it works

```
prompt ──► real AI request starts (streaming, hidden)
       └─► fast model builds a challenge from your prompt

  challenge (~1s) ──► predict + confidence ──► LOCK ──► reveal ──► calibration profile
```

Full flow and the race diagram: [ARCHITECTURE.md](./ARCHITECTURE.md#3-the-race--the-central-diagram).

## Quickstart

```bash
git clone <repo> && cd before-ai
npm install
cp .env.example .env.local     # optional — see Demo mode
npm run dev
```

→ http://localhost:3000

### Environment

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | No | — | Unset ⇒ demo mode |
| `MODEL_ANSWER` | No | `claude-opus-5` | Main answer |
| `MODEL_CHALLENGE` | No | `claude-haiku-4-5` | Challenge generation |
| `MODEL_GRADER` | No | `claude-haiku-4-5` | Grading |

### Demo mode

**Runs fully without an API key.** Fixtures replay token-by-token with realistic timing, so the waiting experience is faithful rather than instant. A **DEMO MODE** badge is always visible — you're never left wondering whether inference is real.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Anthropic SDK · Zod · SSE · localStorage

Five runtime dependencies, on purpose.

## Screenshots

_TODO — Day 15_

## Demo video

_TODO — Day 15_

## WaitOS

Before AI is the first thing built on an idea we think generalises:

```
USER PROMPT → AGENT WORKING → WAITOS EXPERIENCE → RESULT → RESOLUTION
```

Every agent has a wait. Every wait has context. Today that context is thrown away and replaced with a spinner. **WaitOS** is a contextual waiting layer: given a prompt and a pending result, generate an experience derived from that prompt and resolve it against that result.

Before AI is the prediction instantiation. Others follow the same contract — but the submission proves the experience first. WaitOS is not built here, deliberately. See [PRODUCT_SPEC §11](./PRODUCT_SPEC.md#11-explicitly-not-building).

## Project docs

| Doc | Contents |
|---|---|
| [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) | Problem, principles, Commitment Gate, scoring, MVP, non-goals, demo script |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, models, race diagram, SSE protocol, provider abstraction, state machine, data models, risks |
| [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) | 16-day plan, checkpoints, cut order |

## License

MIT
