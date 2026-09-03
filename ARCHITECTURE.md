# Before AI — Architecture

## 1. Stack

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js 15, App Router | Route Handlers give us SSE without a separate server |
| Language | TypeScript, strict | |
| Styling | Tailwind CSS v4 | CSS-first config, no `tailwind.config.js` |
| Animation | Framer Motion | The only non-trivial dependency. 30% of the grade is the reveal — this is where it goes. |
| State | One `useReducer` round machine + one profile hook | No Zustand/Redux. The state is a single finite machine; a reducer *is* the right tool. |
| AI | `@anthropic-ai/sdk` behind a provider interface | |
| Validation | `zod` | Doubles as the structured-output schema via `zodOutputFormat` |
| Persistence | `localStorage` via a `ProfileStore` interface | Supabase adapter is a post-MVP drop-in |
| Deploy | Vercel | |

**Dependency budget: 5 runtime deps.** `next`, `react`, `@anthropic-ai/sdk`, `zod`, `framer-motion`. Anything else needs a reason.

### Why localStorage, not Postgres, for the MVP

A judge opens the deployed URL. With localStorage the profile works instantly, with no signup and no cold database. With Supabase we'd need auth or anonymous session IDs, and a DB that might be cold-started. localStorage is not the compromise here — it's the correct choice for the artifact being judged. The `ProfileStore` interface means swapping in Postgres later is a contained change, and `docs/schema.sql` (§7) is written on Day 11 so the migration path is real and demonstrable, not hand-waved.

## 2. Models

| Path | Model | Config | Why |
|---|---|---|---|
| Main answer | `claude-opus-5` | adaptive thinking, `effort: "high"`, streaming, `max_tokens: 64000` | The answer has to be *good enough to be worth predicting*. Its longer turn is a feature here, not a cost — it is the runway the experience runs on. |
| Challenge generation | `claude-haiku-4-5` | no thinking, `max_tokens: 1024`, forced JSON | Latency-critical. This is the only number that can kill the product. Target p95 < 1.2s. |
| Grading | `claude-haiku-4-5` | no thinking, `max_tokens: 1024`, forced JSON | Runs under the reveal animation, so ~600ms is free. |

All three are `MODELS` constants in `lib/ai/models.ts`, overridable by env. **This split is a decision for you to confirm** — see the summary. Note that Haiku 4.5 predates adaptive thinking; it uses no `thinking` param at all, and `effort` is not valid on it.

## 3. The race — the central diagram

```
t=0        user submits
           │
   ┌───────┴────────────────────────────────────────────────┐
   │ FAST PATH — Haiku 4.5                                  │ SLOW PATH — Opus 5
   │ generateChallenge(prompt)                              │ streamAnswer(prompt)
   │ forced JSON, ~1024 tok                                 │ adaptive thinking, effort high
   │                                                        │
t≈50ms                                                      │
   │  ◄── instant local intent shimmer                      │
   │      regex classifier, zero network                    │
   │      "Reading your prompt · debugging"                 │
   │                                                        ├─► thinking_delta
   │                                                        │   └─► blurred reasoning ticker
t≈900ms                                                     │
   ▼ event: challenge.ready ──────► CHALLENGE UI            ├─► text_delta
                                    options render          │   └─► HIDDEN BUFFER (never rendered)
                                    │                       │
t≈4s                                user picks + confidence  │
t≈7s                                ▼ LOCK ─── commitment gate ───┐
                                                            │     │
t≈9s                                                        ▼     │
                                                    event: answer.done
                                                            │     │
                                    ┌───────────────────────┴─────┘
                                    ▼
                       POST /api/round/grade  (Haiku 4.5, forced JSON)
                       runs *underneath* the 1.2s reveal animation
t≈9.8s                              ▼
                                REVEAL — answer + verdict + evidence quote
```

Three properties of this design worth naming:

1. **Nothing is faked.** Both requests are real and start at t=0.
2. **The 900ms before the challenge exists is covered by a zero-latency local classifier** — a regex/keyword pass over the prompt that yields a category immediately. The UI is never empty and never shows a bare spinner.
3. **Grading is hidden inside the reveal animation**, so it costs zero perceived latency.

## 4. Transport: one SSE stream, one grade POST

`POST /api/round/stream` returns `text/event-stream`. Both AI calls are fanned out server-side and multiplexed onto one ordered event log.

**Why one stream instead of two fetches:** the client drives a finite state machine, and a single ordered event log is the only thing that keeps that machine honest. Two racing fetches means the client owns two abort controllers, two retry policies, and an interleaving it can't observe. One stream, one `AbortController`, one reducer.

Per-event error typing means a challenge failure never kills the answer:

```ts
type RoundEvent =
  | { t: 'round.start';      roundId: string; startedAt: number }
  | { t: 'challenge.ready';  challenge: Challenge }
  | { t: 'challenge.error';  message: string }        // degrade, don't abort
  | { t: 'answer.thinking';  text: string }           // summarized reasoning → blurred ticker
  | { t: 'answer.delta';     text: string }           // → hidden buffer
  | { t: 'answer.progress';  tokens: number; elapsedMs: number }
  | { t: 'answer.done';      answer: AnswerResult }
  | { t: 'answer.error';     message: string }
  | { t: 'round.end' }
```

Grading is a separate `POST /api/round/grade` because its input — the user's prediction — doesn't exist until after the stream has closed.

```
POST /api/round/stream   { prompt }                    → SSE RoundEvent
POST /api/round/grade    { challenge, prediction, answerText } → Grade
GET  /api/health         → { mode: 'live' | 'demo', models }
```

`/api/health` exists so the UI can render an unmissable **DEMO MODE** badge. Judges must never be unsure whether they're seeing real inference.

### SSE on Vercel

Route Handlers must set `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. A heartbeat comment (`:\n\n`) every 15s prevents proxy idle-timeout. The `ReadableStream` must close on client abort — `request.signal` propagates to both SDK calls.

## 5. The provider abstraction

Thin on purpose. Three methods, because there are exactly three things we ask a model to do.

```ts
// lib/ai/provider.ts
export interface AIProvider {
  readonly mode: 'live' | 'demo'
  generateChallenge(prompt: string, signal: AbortSignal): Promise<Challenge>
  streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk>
  gradePrediction(input: GradeInput, signal: AbortSignal): Promise<Grade>
}
```

`getProvider()` returns `AnthropicProvider` when `ANTHROPIC_API_KEY` is set, `MockProvider` otherwise. Route handlers only ever see the interface.

### Structured output

Challenge and grade both go through `client.messages.parse()` with `zodOutputFormat(schema)` — the schema is validated at the API layer, so the model retries on mismatch rather than us parsing brittle JSON out of prose.

```ts
const res = await client.messages.parse({
  model: MODELS.challenge,
  max_tokens: 1024,
  system: CHALLENGE_SYSTEM,
  messages: [{ role: 'user', content: prompt }],
  output_config: { format: zodOutputFormat(ChallengeSchema) },
})
if (!res.parsed_output) throw new ChallengeGenerationError()
```

Fallback if `output_config` misbehaves on Haiku 4.5: a `strict: true` tool with `tool_choice`. **Verified on Day 5, before the challenge engine is built on top of it** — this is the one API assumption that would be expensive to discover late.

### Demo mode is a first-class implementation, not a stub

`MockProvider` replays fixtures for 6 seeded prompts and falls back to a category-matched generic fixture. Critically, it **replays token-by-token with jittered timing** to reproduce real streaming feel — because the thing being judged is the *experience of waiting*, a mock that resolves instantly would misrepresent the product. Fixtures live in `lib/ai/fixtures/`.

## 6. Client state machine

```
        ┌──────┐  submit   ┌────────────┐ challenge.ready ┌─────────────────┐
        │ idle │──────────►│ processing │────────────────►│ challenge_ready │
        └──────┘           └────────────┘                 └─────────────────┘
                                 │                                │ lock
                                 │ challenge.error                ▼
                                 ▼                          ┌───────────┐
                          ┌─────────────┐                   │ predicted │
                          │ degraded    │                   └───────────┘
                          │ (honest     │                         │ answer.done
                          │  wait only) │                         ▼
                          └─────────────┘                    ┌─────────┐
                                 │                           │ grading │
                                 └──────────────────────────►└─────────┘
                                        answer.done                │
                                                                   ▼
                                                            ┌───────────┐
                                                            │ completed │
                                                            └───────────┘
```

`error` is reachable from any state. `predicted → grading → completed` is why the spec's five states are really seven — `predicted` and `grading` are distinct, and conflating them is what produces a reveal that flashes an ungraded verdict for 400ms.

Note the ordering subtlety: **the user can lock before `answer.done`.** The machine must handle lock-then-wait and answer-then-lock identically. This is the highest-risk piece of logic in the app and the reason for the reducer test in §9.

## 7. Data models

```ts
type RoundStatus =
  | 'idle' | 'processing' | 'challenge_ready'
  | 'predicted' | 'grading' | 'completed' | 'degraded' | 'error'

type Category =
  | 'technical' | 'debugging' | 'research' | 'recommendation'
  | 'creative' | 'analysis' | 'planning' | 'other'

interface ChallengeOption {
  id: 'A' | 'B' | 'C' | 'D'
  label: string      // ≤ 8 words — scannable in the 3s the user has
  blurb: string      // ≤ 20 words — the case *for* this option
}

interface Challenge {
  id: string
  question: string           // about the answer, e.g. "What will it blame?"
  category: Category
  options: ChallengeOption[] // 3–4
  format: 'multiple_choice'  // widened post-MVP
  model: string
  latencyMs: number
}

interface Prediction {
  optionId: 'A' | 'B' | 'C' | 'D'
  confidence: number          // 0..100
  reasoning?: string
  lockedAtMs: number          // relative to round start
  lockedBeforeAnswer: boolean // did they beat the machine?
}

interface AnswerResult {
  text: string
  model: string
  outputTokens: number
  latencyMs: number
  thinkingSummary?: string
}

interface Grade {
  correctOptionId: 'A' | 'B' | 'C' | 'D'
  verdict: 'hit' | 'partial' | 'miss'
  score: number          // 0..100, Brier-calibrated
  explanation: string    // ≤ 40 words
  evidenceQuote: string  // verbatim span from answer.text — highlighted in the reveal
}

interface Round {
  id: string
  createdAt: number
  prompt: string
  status: RoundStatus
  challenge?: Challenge
  prediction?: Prediction
  answer?: AnswerResult
  grade?: Grade
  error?: string
}

interface CategoryStats { n: number; hits: number; accuracy: number; avgScore: number }

interface CalibrationProfile {
  version: 1
  totalRounds: number
  hits: number; partials: number; misses: number
  accuracy: number            // (hits + 0.5·partials) / total
  avgConfidence: number
  avgScore: number            // the headline calibration number
  overconfidenceIndex: number // avgConfidence − accuracy·100
  streak: number; bestStreak: number
  byCategory: Partial<Record<Category, CategoryStats>>
  updatedAt: number
}
```

`Round[]` and `CalibrationProfile` are the two localStorage keys (`beforeai.rounds.v1`, `beforeai.profile.v1`). History is capped at 50 rounds; `version` fields exist so a schema change doesn't corrupt a judge's demo.

**Postgres path** (written Day 11, `docs/schema.sql`, not wired): `rounds` and `profiles` tables keyed by an anonymous `session_id` cookie — `rounds` stores `prompt`, `challenge jsonb`, `prediction jsonb`, `answer_text`, `grade jsonb`, and `profiles` is a materialised aggregate. The `ProfileStore` interface is the seam.

## 8. Folder structure

```
before-ai/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                      # the entire experience — one route
│  ├─ globals.css                   # Tailwind v4 @theme tokens
│  └─ api/
│     ├─ round/stream/route.ts      # SSE fan-out
│     ├─ round/grade/route.ts
│     └─ health/route.ts
├─ components/
│  ├─ landing/       Hero · PromptInput · ExamplePrompts · HowItWorks
│  ├─ waiting/       WaitingStage · MachineWorkingPanel · ReasoningTicker
│  │                 · TokenMeter · IntentShimmer
│  ├─ challenge/     ChallengeCard · OptionButton · ConfidenceSlider
│  │                 · ReasoningInput · LockButton
│  ├─ reveal/        RevealStage · VerdictBanner · AnswerPanel
│  │                 · PredictionVsActual · ScoreBadge · EvidenceHighlight
│  ├─ profile/       CalibrationPanel · CategoryBars · OverconfidenceMeter · StreakChip
│  ├─ history/       HistoryDrawer · HistoryRow
│  └─ ui/            Button · Card · Badge · Shimmer · DemoModeBadge
├─ lib/
│  ├─ ai/
│  │  ├─ provider.ts          # the interface
│  │  ├─ anthropic.ts         # live
│  │  ├─ mock.ts              # demo mode
│  │  ├─ models.ts            # model id constants
│  │  ├─ prompts.ts           # ← the highest-value file in the repo
│  │  ├─ schemas.ts           # zod: Challenge, Grade
│  │  └─ fixtures/            # demo-mode replays
│  ├─ round/
│  │  ├─ machine.ts           # reducer
│  │  ├─ useRound.ts          # hook: SSE + reducer
│  │  └─ events.ts            # RoundEvent + SSE encode/decode
│  ├─ scoring/
│  │  ├─ brier.ts
│  │  └─ profile.ts           # profile aggregation
│  ├─ storage/
│  │  ├─ store.ts             # ProfileStore interface
│  │  └─ local.ts             # localStorage impl
│  └─ intent.ts               # zero-latency local classifier
├─ types/index.ts
├─ docs/schema.sql            # Postgres path, unwired
├─ DEVELOPMENT_PLAN.md · PRODUCT_SPEC.md · ARCHITECTURE.md · README.md
└─ .env.example
```

`lib/ai/prompts.ts` is called out deliberately. The product's quality is bounded by whether the challenge generator produces defensible distractors. That file gets more iteration time than any component.

## 9. Testing — deliberately thin

Two things fail silently and would poison the demo:

1. `lib/scoring/brier.ts` — a wrong score is invisible until a judge does the arithmetic.
2. `lib/round/machine.ts` — specifically **lock-before-answer vs. answer-before-lock**, plus the `challenge.error → degraded` path.

Those get real unit tests. Everything else is verified by using the app. This is a hackathon; test coverage is not on the rubric, but a reveal that shows the wrong score on stage is fatal.

## 10. Repository note

This directory is currently *inside* a git repository rooted at the Windows home directory (`C:\Users\D I R E C T  B U Y`), which is tracking thousands of unrelated files. Before any code lands, `before-ai/` needs `git init` of its own and its own remote — otherwise the first commit is unusable and pushing is dangerous. Day 1, first task.

## 11. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Challenge distractors are obviously wrong | Fatal — the game isn't a game | Prompt engineering is a first-class Day 5–6 task with a written eval set of 15 prompts. Not a component-building afterthought. |
| Challenge generation p95 > 2s | Severe — dead air before the mechanic | Haiku 4.5, low `max_tokens`, tight system prompt, local intent shimmer covers the gap. Measured on Day 6. |
| `output_config.format` unsupported/flaky on Haiku 4.5 | Blocks the engine | **Verified Day 5, before building on it.** `strict: true` tool-use fallback ready. |
| Grader disagrees with an obviously-correct human prediction | Feels unfair, breaks trust | `partial` verdict absorbs near-misses; grader must quote verbatim evidence from the answer, which constrains it to defensible calls. |
| Opus 5 answers too fast on trivial prompts | No wait to fill | Commitment Gate makes this a non-issue by construction — this is exactly the case the design was built for. |
| SSE dies behind Vercel proxy | Total failure in the deployed demo | 15s heartbeat; deploy on **Day 3**, not Day 15. |
| Reasoning ticker leaks the answer | Ruins the round | `display: "summarized"` only, rendered blurred, hard-truncated. Never the raw answer buffer. |
| Scope creep into WaitOS | Loses the hackathon | It's a README section and a slide. Written down in PRODUCT_SPEC §11. |
