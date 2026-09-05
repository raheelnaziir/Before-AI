'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { readEvents } from './events'
import {
  initialRoundState,
  isDegraded,
  revealedAnswer,
  roundReducer,
  type RoundState,
} from './machine'
import type { Grade, OptionId } from '@/types'

export interface UseRound {
  state: RoundState
  /** Answer text, or null while the Commitment Gate is shut. */
  answer: string | null
  start: (prompt: string) => void
  lock: (optionId: OptionId, confidence: number) => void
  reset: () => void
}

/** Called once per completed round, after the grade settles. */
export interface RoundCompleteInput {
  state: RoundState
  grade: Grade | null
}

export interface UseRoundOptions {
  /**
   * Fired when a graded round finishes. The hook owns the round; the profile
   * owns the aggregate. Keeping them separate is what stops a re-render of the
   * profile touching the state machine.
   */
  onComplete?: (input: RoundCompleteInput) => void
}

export function useRound(options: UseRoundOptions = {}): UseRound {
  const [state, dispatch] = useReducer(roundReducer, initialRoundState)
  const abortRef = useRef<AbortController | null>(null)
  /** Guards against a double-grade if the effect re-runs. */
  const gradedRoundRef = useRef<string | null>(null)
  /** Fires `onComplete` exactly once per round. */
  const recordedRoundRef = useRef<string | null>(null)

  // Held in a ref so a new callback identity doesn't re-trigger the effects below.
  const onCompleteRef = useRef(options.onComplete)
  useEffect(() => {
    onCompleteRef.current = options.onComplete
  }, [options.onComplete])

  /** Tear down any in-flight stream. Called before a new round and on unmount. */
  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  useEffect(() => abort, [abort])

  const start = useCallback(
    (prompt: string) => {
      // Never leave an orphaned stream behind.
      abort()
      gradedRoundRef.current = null
      recordedRoundRef.current = null

      const controller = new AbortController()
      abortRef.current = controller

      dispatch({ type: 'START', prompt, startedAt: Date.now() })

      void (async () => {
        try {
          const response = await fetch('/api/round/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: controller.signal,
          })

          if (!response.ok) {
            // Errors before the stream opens come back as JSON.
            const detail = (await response.json().catch(() => null)) as {
              error?: string
            } | null
            dispatch({
              type: 'FAIL',
              message: detail?.error ?? 'The request was rejected.',
            })
            return
          }

          if (!response.body) {
            dispatch({ type: 'FAIL', message: 'The server sent no response stream.' })
            return
          }

          for await (const event of readEvents(response.body)) {
            if (controller.signal.aborted) return
            dispatch({ type: 'EVENT', event })
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
          dispatch({
            type: 'FAIL',
            message: 'Lost the connection while the answer was streaming.',
          })
        }
      })()
    },
    [abort],
  )

  const lock = useCallback((optionId: OptionId, confidence: number) => {
    dispatch({ type: 'LOCK', optionId, confidence, at: Date.now() })
  }, [])

  const reset = useCallback(() => {
    abort()
    gradedRoundRef.current = null
    recordedRoundRef.current = null
    dispatch({ type: 'RESET' })
  }, [abort])

  /* ── grading ───────────────────────────────────────────────────────────────
     Fires on entry to `grading`, which is exactly when the gate opened — so the
     request goes out under the reveal animation and its latency is free. Both
     race orderings reach this state identically, which is why there is no
     ordering logic here. */
  useEffect(() => {
    if (state.status !== 'grading') return
    if (state.challenge === null || state.prediction === null) return

    const answerText = state.answer?.text ?? state.answerBuffer
    if (!answerText) {
      dispatch({ type: 'GRADE_FAILED', message: 'The answer was empty.' })
      return
    }

    // React may run this effect twice in development; the round id makes the
    // second run a no-op rather than a second billed request.
    const roundKey = state.roundId ?? String(state.startedAt)
    if (gradedRoundRef.current === roundKey) return
    gradedRoundRef.current = roundKey

    const controller = new AbortController()

    void (async () => {
      try {
        const response = await fetch('/api/round/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge: state.challenge,
            prediction: {
              optionId: state.prediction?.optionId,
              confidence: state.prediction?.confidence,
            },
            answerText,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as {
            error?: string
          } | null
          dispatch({
            type: 'GRADE_FAILED',
            message: detail?.error ?? 'The AI judge could not be reached.',
          })
          return
        }

        dispatch({ type: 'GRADED', grade: (await response.json()) as Grade })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        dispatch({ type: 'GRADE_FAILED', message: 'The AI judge could not be reached.' })
      }
    })()

    return () => controller.abort()
    // Deliberately narrow: this must fire on the *transition* into `grading`, not
    // on every subsequent change to the challenge or prediction objects (which are
    // frozen by then anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  /* ── persistence handoff ───────────────────────────────────────────────────
     One call per completed round, whether or not grading succeeded. A round with
     no grade is not recorded — there is no verdict to aggregate — but the
     callback still fires so the UI can react. */
  useEffect(() => {
    if (state.status !== 'completed') return
    const roundKey = state.roundId ?? String(state.startedAt)
    if (recordedRoundRef.current === roundKey) return
    recordedRoundRef.current = roundKey

    onCompleteRef.current?.({ state, grade: state.grade })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status])

  return {
    state,
    // Degraded rounds have no prediction to protect; `revealedAnswer` handles
    // that case, and this call is the only path any component has to the text.
    answer: revealedAnswer(state),
    start,
    lock,
    reset,
  }
}

/** Re-exported so pages don't reach into the machine for one predicate. */
export { isDegraded }
