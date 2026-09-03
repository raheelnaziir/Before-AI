'use client'

import { useEffect, useState } from 'react'
import type { HealthResponse } from '@/types'

type Health = 'checking' | 'ok' | 'unreachable'

/**
 * Thin status chip over /api/health.
 *
 * Exists so the endpoint is verifiable from the UI. Grows into the
 * DemoModeBadge once the provider reports `live | demo` on Day 4.
 */
export function SystemStatus() {
  const [health, setHealth] = useState<Health>('checking')
  const [mode, setMode] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<HealthResponse>) : null))
      .then((body) => {
        if (!body) throw new Error('bad status')
        setMode(body.mode)
        setHealth('ok')
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setHealth('unreachable')
      })

    return () => controller.abort()
  }, [])

  const label =
    health === 'ok' ? (mode ?? 'ok') : health === 'checking' ? '···' : 'offline'

  return (
    <span className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-ink-faint uppercase">
      <span
        aria-hidden
        className={
          health === 'ok'
            ? 'size-1.5 rounded-full bg-signal-dim'
            : health === 'checking'
              ? 'size-1.5 rounded-full bg-line-strong'
              : 'size-1.5 rounded-full bg-violet'
        }
      />
      {label}
    </span>
  )
}
