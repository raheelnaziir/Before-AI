# Before AI — Product Spec

> **Think before the machine does.**

Submission for **Commons — "Make Waiting for AI Fun."**

---

## 1. The one-sentence pitch

Before AI turns the dead time while an AI answers your prompt into a prediction round about *that specific prompt* — you commit to what the machine will say, then watch it say it, and build a Human × AI calibration profile over time.

## 2. The problem, stated precisely

The hackathon frames it as "waiting is boring." That framing produces loading games — Snake in a spinner. Those lose, because they answer a *different* question: "how do I distract a user for 8 seconds?"

The real problem is sharper:

> **The waiting period is the only moment in an AI interaction where the user still has an independent opinion — and we throw it away.**

The instant the answer lands, the user's own model of the problem is overwritten. Anchoring is immediate and total. Nobody ever finds out whether they were right, because they never committed. Every AI interaction quietly erodes the user's sense of their own judgment, and the loading spinner is where that erosion happens.

So: the wait isn't wasted time to be filled. It's the **last honest moment**, and it should be captured.

## 3. What we are building

A prediction round wrapped around a real AI request.

1. User enters a prompt.
2. The real AI request starts immediately. Nothing is faked.
3. In parallel, a fast model reads the prompt and generates a **contextual prediction challenge** — a question about what the answer will contain, with 3–4 defensible options.
4. The user picks an option, sets a confidence level, and optionally writes one line of reasoning.
5. The answer is **withheld until the user commits.**
6. Reveal: the real answer, side by side with the prediction, graded semantically, with the sentence from the answer that settled it.
7. The round feeds a persistent calibration profile: accuracy, overconfidence, per-category strength.

## 4. The product principle that governs every decision

**The challenge must be about the prompt. Always.**

If the user asks "why is my useEffect firing twice," the challenge is *"What will the AI blame?"* — with `StrictMode double-invoke`, `missing dependency array`, `stale closure`, `parent re-render` as options. Three of those are wrong but every one of them is something a competent engineer might say. That's the bar.

Corollaries we hold ourselves to:

- **No generic mini-game.** Ever. Not as a fallback, not as a "while we load the challenge" filler.
- **No fake progress.** Every progress signal is derived from real stream state — tokens received, elapsed time, actual reasoning activity.
- **The distractors must be defensible.** A challenge where the right answer is obvious is a failed challenge. This is the single highest-leverage prompt-engineering problem in the project.
- **The challenge generator never sees the answer.** It generates from the prompt alone, in parallel with the answer. Correctness is determined afterwards by a grader that reads the real answer. This is what makes the prediction honest rather than theater.

## 5. The Commitment Gate — the idea that makes it work

There is an obvious objection: *streaming means there is barely any wait. If the answer starts appearing in 900ms, what exactly is the user waiting for?*

Our answer: **we stop treating the wait as a technical latency window and start treating it as a commitment window.**

The answer streams in from t≈1s. We buffer it and do not render it. The gate opens when the user locks a prediction — not when the model finishes. This flips the whole dynamic:

- The experience no longer degrades as models get faster. It gets *better* — the answer is already sitting there, warm, the instant you commit.
- The user is never waiting on us; they're deciding.
- It is honest. A prediction made after seeing the answer isn't a prediction. Withholding is the only correct implementation.
- It makes the product durable. "Fill the latency" is a product with a shrinking market. "Capture the pre-answer opinion" is not.

We show a live, real indicator that the machine is working the whole time — including a blurred ticker of its own summarized reasoning — so the user always knows this is a real request, not a quiz.

**If the user finishes predicting before the answer does**, they wait a moment on a genuinely-still-working indicator. **If the answer finishes first**, we say so plainly — *"Answer ready. Locked until you commit."* — which converts latency anxiety into anticipation.

## 6. Core loop

```
prompt ──► real AI request starts (hidden, streaming)
       └─► fast model generates challenge from prompt

  challenge appears (~1s) ──► predict + confidence + reasoning ──► LOCK

  LOCK ──► reveal answer ──► semantic grade ──► score + explanation
        └─► calibration profile updates ──► "ask another"
```

## 7. Scoring — why it's calibration, not accuracy

Accuracy alone is a boring, un-actionable number. We score with a **Brier-style calibration metric**, which rewards *knowing what you know*:

```
outcome  = hit 1.0 | partial 0.5 | miss 0.0
c        = confidence, normalised to 0..1
score    = round(100 × (1 − (c − outcome)²))
```

Consequences that make the product interesting:

| You said | Result | Score | Feels like |
|---|---|---|---|
| 95% confident | Hit | 100 | earned |
| 95% confident | Miss | 10 | *deserved* |
| 50% confident | Miss | 75 | honest hedge, rewarded |
| 50% confident | Hit | 75 | you knew you didn't know |

This produces the headline stat that makes the profile shareable:

> **Overconfidence Index = average confidence − accuracy**
> `+14 — you trust yourself more than you should` / `−6 — you're better than you think`

That's a number people screenshot. It's also, genuinely, a useful thing to know about yourself in an era of AI-assisted work.

## 8. Categories

Derived by the challenge generator from the prompt, used for per-category breakdown:

`technical` · `debugging` · `research` · `recommendation` · `creative` · `analysis` · `planning` · `other`

Profile surface:

```
Overall calibration   82        Streak  4
Technical             91  ████████████▏
Debugging             78  ██████████▎
Research              76  █████████▉
Creative              61  ███████▉
Overconfidence       +14  you trust yourself more than you should
```

## 9. MVP feature set

| # | Feature | Why it earns its place |
|---|---|---|
| 1 | Landing with identity, prompt input, 6 seeded example prompts | First 5 seconds of the judge's experience |
| 2 | Real streaming AI request, buffered behind the gate | The whole premise |
| 3 | AI-generated contextual challenge (MCQ, 3–4 defensible options) | The core mechanic |
| 4 | Confidence selector + optional one-line reasoning | Makes the score meaningful |
| 5 | Live "machine is working" panel — real tokens, real elapsed, blurred reasoning ticker | 30% of the grade lives here |
| 6 | Semantic grading with an evidence quote pulled from the answer | Makes the verdict feel fair, not arbitrary |
| 7 | Reveal animation | The payoff moment; what gets recorded for the demo video |
| 8 | Calibration profile (localStorage) | 15% repeatability |
| 9 | History of past rounds | Repeatability, and it makes the profile legible |
| 10 | Demo mode with no API key | Judges will run this without a key. Non-negotiable. |

## 10. Stretch — build only if Day 13 arrives clean

- **Peek** — reveal the machine's live reasoning summary at a 20% score cost. Cheap to build, extremely on-theme, and it makes the tension explicit.
- Shareable result card (PNG via OG image route).
- Non-MCQ challenge formats: numeric-scale ("how many steps will it recommend?"), ranking.
- Supabase persistence behind the existing store interface.

## 11. Explicitly NOT building

Written down so we don't drift into it at 2am on Day 11.

| Not building | Why |
|---|---|
| Accounts, auth, login | Zero judge value, one full day of cost. localStorage is *better* for a demo — instant, no signup wall. |
| Multiplayer / lobbies / live leaderboards | A different product. Enormous scope. |
| The full WaitOS platform — SDK, plugin registry, docs site | The submission proves the *experience*. WaitOS is one clearly-marked section in the README and one slide. Building the abstraction before the second consumer exists is how hackathons are lost. |
| Multiple AI providers wired up | We build the *interface* so the swap is a day's work. We ship one implementation. |
| Chat / multi-turn conversation | Each round is one prompt. Multi-turn multiplies state complexity and adds nothing to any judging criterion. |
| Image generation rounds | Cost, latency variance, and a second entirely different reveal UI. Listed as a vision example only. |
| Mobile-first responsive polish | Desktop-first as directed. Stays usable at tablet width; we don't chase 375px. |
| Generic fallback mini-game | Violates the core principle. If challenge generation fails we degrade to a real, honest waiting panel with the reasoning ticker — never to Snake. |
| Server-side analytics, telemetry, dashboards | No time, no judge value. |
| Tests beyond a thin layer on scoring + the SSE state machine | Hackathon. Test the two things that silently produce wrong output. |

## 12. What "winning" looks like against the rubric

| Criterion | Weight | Our play |
|---|---|---|
| Waiting experience | 30% | The wait is the product, not a patch over it. Real signals, real stakes, a payoff moment. |
| Originality | 25% | Commitment Gate + calibration scoring. Nobody else will withhold the answer on purpose, and nobody else will score for overconfidence. |
| Fit with AI agents | 20% | The challenge is derived from the user's actual prompt and graded against the actual answer. It cannot exist without the AI. |
| Repeatability | 15% | The profile is the retention loop — you come back to find out if you're getting better. Every round is a different prompt, so every round is a new challenge. |
| Execution | 10% | Tight scope, one dark premium visual language, works with no API key. |

## 13. The demo, scripted

Ninety seconds, rehearsed, recorded on Day 15.

1. **0:00** — Land. "Think before the machine does." Type a real debugging prompt.
2. **0:08** — Submit. Panel: *the machine is working* — token counter climbing, blurred reasoning ticker.
3. **0:10** — Challenge resolves: *"What will it blame?"* Four options, all plausible. Pick one. Confidence 80%. One line of reasoning.
4. **0:25** — Lock. `Answer ready — locked until you commit.`
5. **0:27** — Reveal. Answer renders. Verdict lands. The evidence sentence highlights inside the answer.
6. **0:40** — Score: 92. *"Confident and correct."*
7. **0:45** — Profile updates live. Overconfidence Index moves.
8. **0:55** — Second round, different category, to show the challenge genuinely changes shape.
9. **1:20** — One WaitOS line: *"Any agent, any wait, any contextual experience."* End.
