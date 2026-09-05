import type { NextRequest } from 'next/server'
import { getProvider, resolveMode } from '@/lib/ai'
import { safeMessage } from '@/lib/ai/errors'
import { StreamRequestSchema } from '@/lib/ai/schemas'
import { classifyPrompt } from '@/lib/intent'
import { HEARTBEAT, encodeEvent, type RoundEvent } from '@/lib/round/events'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Throttle for progress events. Per-token updates would jank the UI. */
const PROGRESS_INTERVAL_MS = 150
const HEARTBEAT_INTERVAL_MS = 15_000

export async function POST(request: NextRequest): Promise<Response> {
  // ── validate ──────────────────────────────────────────────────────────────
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = StreamRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { prompt } = parsed.data

  // Resolving the provider can throw (live mode without a key). Do it before
  // opening the stream so the failure is an honest HTTP status, not an SSE event
  // the client has to unpick.
  let provider
  try {
    provider = getProvider()
  } catch (error) {
    console.error('[round/stream] provider unavailable:', error)
    return Response.json({ error: safeMessage(error) }, { status: 503 })
  }

  // ── stream ────────────────────────────────────────────────────────────────
  const controller = new AbortController()
  // Client disconnect or navigation tears down the upstream requests too, so we
  // never pay for tokens nobody will see.
  request.signal.addEventListener('abort', () => controller.abort(), { once: true })

  const encoder = new TextEncoder()
  const roundId = crypto.randomUUID()
  const startedAt = Date.now()

  const body = new ReadableStream<Uint8Array>({
    async start(sink) {
      let heartbeat: ReturnType<typeof setInterval> | undefined
      let closed = false

      const send = (event: RoundEvent) => {
        if (closed) return
        sink.enqueue(encoder.encode(encodeEvent(event)))
      }

      try {
        heartbeat = setInterval(() => {
          if (!closed) sink.enqueue(encoder.encode(HEARTBEAT))
        }, HEARTBEAT_INTERVAL_MS)

        send({
          t: 'round.start',
          roundId,
          startedAt,
          mode: provider.mode,
          // Zero-latency local classification. Gives the UI something true to say
          // during the ~900ms before the generated challenge exists.
          intent: classifyPrompt(prompt),
        })

        /* ── the fan-out ───────────────────────────────────────────────────────
           Both calls start now, at t=0, and neither can observe the other. The
           challenge generator is handed the prompt and nothing else — that is what
           makes the prediction honest rather than theater (PRODUCT_SPEC §4).

           Started here but awaited below: kicking the challenge off before
           entering the answer loop is the whole point, and awaiting it first would
           serialise the two and delay the answer by the challenge's latency. */
        const challengePromise = provider
          .generateChallenge(prompt, controller.signal)
          .then((challenge): RoundEvent => ({ t: 'challenge.ready', challenge }))
          .catch((error: unknown): RoundEvent | null => {
            if (controller.signal.aborted) return null
            console.error('[round/stream] challenge failed:', error)
            // Degrade, never abort — the answer lane is untouched.
            return { t: 'challenge.error', message: safeMessage(error) }
          })

        // Forward the challenge the moment it lands, without blocking the answer.
        let challengeSent = false
        const challengeForwarded = challengePromise.then((event) => {
          challengeSent = true
          if (event) send(event)
        })

        let chars = 0
        let deltas = 0
        let lastProgressAt = 0

        try {
          for await (const chunk of provider.streamAnswer(prompt, controller.signal)) {
            if (controller.signal.aborted) break

            if (chunk.kind === 'thinking') {
              send({ t: 'answer.thinking', text: chunk.text })
              continue
            }

            if (chunk.kind === 'text') {
              chars += chunk.text.length
              deltas += 1
              send({ t: 'answer.delta', text: chunk.text })

              const now = Date.now()
              if (now - lastProgressAt >= PROGRESS_INTERVAL_MS) {
                lastProgressAt = now
                send({
                  t: 'answer.progress',
                  chars,
                  deltas,
                  elapsedMs: now - startedAt,
                })
              }
              continue
            }

            // The answer beat the challenge. Hold `answer.done` until the
            // challenge has been sent: the client must have something to commit to
            // before it learns the answer is ready, or the "answer held" state
            // arrives with no challenge on screen.
            if (!challengeSent) await challengeForwarded

            send({
              t: 'answer.done',
              answer: {
                text: chunk.text,
                model: chunk.model,
                outputTokens: chunk.outputTokens,
                latencyMs: Date.now() - startedAt,
              },
            })
          }
        } catch (error) {
          // An abort is a normal ending, not a failure worth reporting.
          if (!controller.signal.aborted) {
            console.error('[round/stream] answer failed:', error)
            send({ t: 'answer.error', message: safeMessage(error) })
          }
        }

        // A fast answer can finish before a slow challenge. Don't close the stream
        // on an unsettled lane, or the round ends with no challenge at all.
        await challengeForwarded

        send({ t: 'round.end' })
      } catch (error) {
        console.error('[round/stream] stream failed:', error)
      } finally {
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        controller.abort()
        try {
          sink.close()
        } catch {
          // Already closed by the client going away.
        }
      }
    },

    cancel() {
      controller.abort()
    },
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops nginx-style proxies buffering the stream into uselessness.
      'X-Accel-Buffering': 'no',
      'X-Provider-Mode': resolveMode(),
    },
  })
}
