'use client'

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { readEvents } from './events'
import {
  initialRoundState,
  revealedAnswer,
  roundReducer,
  type RoundState,
} from './machine'
import type { OptionId } from '@/types'

export interface UseRound {
  state: RoundState
  /** Answer text, or null while the Commitment Gate is shut. */
  answer: string | null
  start: (prompt: string) => void
  lock: (optionId: OptionId) => void
  reset: () => void
}

export function useRound(): UseRound {
  const [state, dispatch] = useReducer(roundReducer, initialRoundState)
  const abortRef = useRef<AbortController | null>(null)

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

  const lock = useCallback((optionId: OptionId) => {
    dispatch({ type: 'LOCK', optionId, at: Date.now() })
  }, [])

  const reset = useCallback(() => {
    abort()
    dispatch({ type: 'RESET' })
  }, [abort])

  return { state, answer: revealedAnswer(state), start, lock, reset }
}
