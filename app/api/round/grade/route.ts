import type { NextRequest } from 'next/server'
import { getProvider } from '@/lib/ai'
import { safeMessage } from '@/lib/ai/errors'
import { GradeRequestSchema } from '@/lib/ai/schemas'
import type { Grade } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/round/grade
 *
 * Separate from the stream because its input — the locked prediction — does not
 * exist until after the stream has closed (ARCHITECTURE §4).
 *
 * The client sends the answer text back rather than the server holding it: route
 * handlers are stateless across requests, and the alternative is a server-side
 * round cache that would have to expire, which is a lot of machinery for a payload
 * the client has already been shown. Nothing is disclosed by echoing it — the
 * commitment has already happened by the time this endpoint is reachable.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = GradeRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { challenge, prediction, answerText } = parsed.data

  // The prediction must refer to an option that exists, or the grader is being
  // asked about something the user could not have picked.
  if (!challenge.options.some((option) => option.id === prediction.optionId)) {
    return Response.json({ error: 'Prediction does not match the challenge.' }, { status: 400 })
  }

  let provider
  try {
    provider = getProvider()
  } catch (error) {
    console.error('[round/grade] provider unavailable:', error)
    return Response.json({ error: safeMessage(error) }, { status: 503 })
  }

  const controller = new AbortController()
  request.signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const grade: Grade = await provider.gradePrediction(
      {
        challenge,
        optionId: prediction.optionId,
        confidence: prediction.confidence,
        answerText,
      },
      controller.signal,
    )

    return Response.json(grade, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // Grading is the one lane whose failure the client absorbs gracefully — the
    // answer and the prediction are both already on screen.
    console.error('[round/grade] grading failed:', error)
    return Response.json({ error: safeMessage(error) }, { status: 502 })
  }
}
