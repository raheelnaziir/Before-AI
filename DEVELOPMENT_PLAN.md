# Before AI — 16-Day Development Plan

Working assumption: **~4 focused hours/day**, one developer. Days are sized against that. If you have more, the plan absorbs it in the Day 13–14 buffer.

**Three dates are load-bearing:**
- **Day 3 — deployed to Vercel.** Not "deployable." Deployed, with a URL, while the app is trivial. SSE-behind-a-proxy failures found on Day 15 are unrecoverable.
- **Day 5 — structured output verified against the real API.** Before the challenge engine is built on top of it.
- **Day 12 — feature freeze.** Everything after is polish, demo, and buffer.

---

## Phase 1 — Foundation (Days 1–3)

### Day 1 — Repo, scaffold, design system
- **`git init` inside `before-ai/` first.** This directory currently sits inside a repo rooted at the Windows home folder. Nothing else happens until that's fixed.
- `create-next-app` — TS, Tailwind v4, App Router, ESLint. Install `zod`, `@anthropic-ai/sdk`, `framer-motion`. Stop there.
- Design tokens in `globals.css` via Tailwind v4 `@theme`: near-black base, one cyan/violet accent, IBM Plex Mono for machine output, Inter for UI.
- `components/ui/`: Button, Card, Badge, Shimmer.
- `types/index.ts` — every interface from ARCHITECTURE §7, verbatim. Types before logic; it makes the next 12 days type-guided.
- `.env.example`, README skeleton committed.

**Done when:** `npm run dev` shows a dark, on-brand empty shell.

### Day 2 — Landing
- Hero: wordmark, "Think before the machine does.", one-line explainer.
- `PromptInput` — auto-grow textarea, ⌘/Ctrl+Enter submit, character guard.
- `ExamplePrompts` — 6 seeded prompts spanning debugging / technical / research / recommendation / creative / analysis. **These same 6 become the demo-mode fixtures**, so choose them now and don't change them.
- `HowItWorks` — three steps, no scroll-jacking.
- `DemoModeBadge` wired to `/api/health`.

**Done when:** the landing page alone would make a judge curious.

### Day 3 — SSE spine + **deploy**
- `lib/round/events.ts` — `RoundEvent` union, SSE encode/decode.
- `app/api/round/stream/route.ts` — `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, 15s heartbeat, abort propagation. Emits **hardcoded** events on a timer. No AI yet.
- `app/api/health/route.ts`.
- `lib/round/machine.ts` + `useRound.ts` — reducer consuming real SSE.
- **Deploy to Vercel. Confirm SSE survives the proxy in production.**

**Done when:** the production URL streams fake events into a real client state machine. This is the single most important checkpoint in the plan.

---

## Phase 2 — AI core (Days 4–7)

### Day 4 — Provider abstraction + real answer stream
- `lib/ai/provider.ts`, `models.ts`, `anthropic.ts`.
- `streamAnswer` — `claude-opus-5`, `thinking: { type: 'adaptive', display: 'summarized' }`, `output_config: { effort: 'high' }`, `max_tokens: 64000`, `client.messages.stream()`.
- Map `text_delta → answer.delta`, `thinking_delta → answer.thinking`, plus a throttled `answer.progress` (~every 150ms — per-token progress events will jank the UI).
- Typed error handling per the SDK's error classes.

**Done when:** a real prompt streams real Opus 5 tokens through SSE into the buffer, and the reasoning summary arrives separately from the answer.

### Day 5 — **Verify structured output**, then build the challenge generator
Order matters. Verify first.
- Spike: `client.messages.parse()` + `zodOutputFormat` against `claude-haiku-4-5`. Confirm `parsed_output` is populated and measure latency. If it fails → `strict: true` tool + `tool_choice`. **Record which path works in ARCHITECTURE §5.**
- `lib/ai/schemas.ts` — `ChallengeSchema`, `GradeSchema`.
- `generateChallenge` on the verified path.
- First cut of `CHALLENGE_SYSTEM` in `lib/ai/prompts.ts`.

**Done when:** an arbitrary prompt yields a schema-valid `Challenge` in under ~1.5s.

### Day 6 — Prompt engineering (the real work)
This is the day that determines whether the product is good. It is not a component day.
- Write an eval set: **15 prompts**, 2–3 per category. Keep them in `lib/ai/fixtures/eval.ts`.
- Iterate `CHALLENGE_SYSTEM` until distractors are genuinely defensible. Explicit rules in the prompt: options mutually exclusive; every option plausible to an expert; the question must be about *the answer's content*, not the topic; ≤8 words per label.
- Self-check pass in the prompt: *"Would a knowledgeable person pick the wrong option here? If not, rewrite."*
- Measure p50/p95 latency across all 15. Tune `max_tokens` down until quality degrades, then back off.
- Fan-out both AI calls in the stream route; challenge failure emits `challenge.error` and the answer continues.

**Done when:** you personally get 2 of 5 wrong on your own eval set. If you're getting 5/5, the distractors are too easy and the product doesn't work yet.

### Day 7 — Grading + scoring
- `gradePrediction` — Haiku 4.5, forced JSON, receives challenge + prediction + full answer text.
- **`evidenceQuote` must be verbatim from the answer.** Validate it with `answer.includes(quote)`; on failure, retry once, then drop the quote rather than showing a fabricated one.
- `POST /api/round/grade`.
- `lib/scoring/brier.ts` + unit tests — the boundary cases: 0% confidence, 100% confidence, all three verdicts.
- `lib/scoring/profile.ts` — aggregation including `overconfidenceIndex`.

**Done when:** a full round runs end-to-end in the terminal/network tab with a correct score. UI still ugly.

---

## Phase 3 — The experience (Days 8–11)

### Day 8 — Waiting stage
The 30% criterion. Build it properly.
- `lib/intent.ts` — zero-latency regex classifier → instant `IntentShimmer` ("Reading your prompt · debugging").
- `MachineWorkingPanel` — real elapsed timer, real `TokenMeter` from `answer.progress`, phase label.
- `ReasoningTicker` — summarized thinking, blurred + hard-truncated, never the answer buffer.
- **`degraded` state**: an honest waiting panel when challenge generation fails. Never a fallback mini-game.

**Done when:** watching it work is genuinely interesting for 10 seconds with nothing to click.

### Day 9 — Challenge UI + the Commitment Gate
- `ChallengeCard` entrance — this is the moment the product reveals itself; it should feel like a card being dealt.
- `OptionButton` (label + blurb), `ConfidenceSlider` (live language: "hunch" → "fairly sure" → "certain"), `ReasoningInput` (one line, optional, no pressure).
- `LockButton` — irreversible, and it should feel irreversible.
- **The gate:** answer stays buffered. If `answer.done` fires pre-lock, show `Answer ready — locked until you commit.` If lock fires first, show a real still-working state.
- Reducer tests for both orderings.

**Done when:** locking in feels like a decision with stakes.

### Day 10 — Reveal
The payoff. This is what gets recorded.
- Framer Motion sequence: gate dissolve → verdict → score count-up → answer render → evidence highlight. ~1.2s total, and grading completes underneath it.
- `VerdictBanner` — distinct treatments for hit / partial / miss. Miss must feel *fair*, not punishing.
- `PredictionVsActual` side-by-side; user's reasoning shown back to them.
- `EvidenceHighlight` — the quote highlighted inside the streamed answer. This is what makes the verdict feel earned rather than asserted.
- `ScoreBadge` with the calibration line ("Confident and correct." / "Overconfident on that one.").
- `prefers-reduced-motion` respected throughout.

**Done when:** you want to show someone. That's the actual bar.

### Day 11 — Profile + history
- `lib/storage/store.ts` interface + `local.ts`, versioned keys, corruption-safe reads.
- `CalibrationPanel`, `CategoryBars`, `OverconfidenceMeter`, `StreakChip` — animate on update, immediately after reveal.
- `HistoryDrawer` — 50 rounds, expandable rows, replay of prediction vs. actual.
- `docs/schema.sql` — the Postgres path, written and committed, deliberately unwired.

**Done when:** three rounds in, the profile makes you want a fourth.

---

## Phase 4 — Ship (Days 12–16)

### Day 12 — Demo mode + **feature freeze**
- `MockProvider`: fixtures for all 6 seeded prompts + a category-matched generic fallback.
- **Token-by-token replay with jittered timing.** An instant mock misrepresents the product — the thing being judged is the waiting experience.
- Unset the key locally and run every path. Demo mode must be indistinguishable in feel.
- **Freeze. No new features after today.**

### Day 13 — Hardening
- Error paths: no key, bad key, rate limit, network drop mid-stream, abort/back-navigation, refresh mid-round, empty/absurd prompts.
- Empty and first-run states.
- Loading skeletons; no layout shift anywhere.
- Lighthouse; kill the obvious weight.

### Day 14 — Polish + buffer
- Micro-interactions, focus rings, keyboard path end-to-end, tablet width check.
- Copy pass — every string. Tone: confident, dry, never cute.
- **Reserved buffer.** Something will have slipped. If nothing has, build **Peek** (reveal live reasoning at a 20% score cost) — cheap, on-theme, and it makes the central tension explicit.

### Day 15 — Demo video + README
- Rehearse the PRODUCT_SPEC §13 script until it's clean. Record on the deployed URL, not localhost.
- Two rounds, different categories, to prove the challenge genuinely varies.
- Full README: what/why, screenshots, GIF, quickstart, demo-mode note, the WaitOS section, architecture summary.
- Deploy final.

### Day 16 — Submit
- Morning: cold-open the deployed URL on a fresh browser profile, no key, as a judge would.
- Submission form, links, description.
- **Submit with hours to spare.** Do not touch the code after submitting.

---

## Cut order, decided in advance

When you fall behind — and you will — cut from the bottom:

1. Peek
2. History drawer (keep the profile)
3. Reasoning input (keep confidence)
4. Category bars (keep overall calibration)
5. Reasoning ticker (keep token meter + elapsed)

**Never cut:** the contextual challenge, the Commitment Gate, the reveal animation, demo mode. Those four *are* the product.
