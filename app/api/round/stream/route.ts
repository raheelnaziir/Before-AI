import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { getProvider, resolveMode } from '@/lib/ai'
import { ConfigurationError, RefusalError } from '@/lib/ai/provider'
import { StreamRequestSchema } from '@/lib/ai/schemas'
import { HEARTBEAT, encodeEvent, type RoundEvent } from '@/lib/round/events'
import { placeholderChallenge } from '@/lib/round/placeholderChallenge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Throttle for progress events. Per-token updates would jank the UI. */
const PROGRESS_INTERVAL_MS = 150
const HEARTBEAT_INTERVAL_MS = 15_000

/**
 * Map an internal failure to something safe to show a user.
 *
 * Upstream messages are never forwarded — they can carry request details, and a
 * stack trace is never the user's problem. The real error is logged server-side.
 */
function safeMessage(error: unknown): string {
  if (error instanceof ConfigurationError) {
    return 'The AI provider is not configured on this server.'
  }
  if (error instanceof RefusalError) {
    return 'The model declined this prompt. Try rephrasing it.'
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return 'The AI provider rejected this server’s credentials.'
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'The AI provider is rate limiting us. Give it a moment.'
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the AI provider. Check the connection and retry.'
  }
  if (error instanceof Anthropic.APIError) {
    return 'The AI provider returned an error.'
  }
  return 'Something went wrong while generating the answer.'
}

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
  // Client disconnect or navigation tears down the upstream request too, so we
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

        send({ t: 'round.start', roundId, startedAt, mode: provider.mode })

        // Emitted immediately and without an artificial delay. The real
        // generator will introduce genuine latency here; faking it now would
        // break the no-fake-signals rule.
        send({ t: 'challenge.ready', challenge: placeholderChallenge() })

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
