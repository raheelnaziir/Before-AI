import type { NextRequest } from 'next/server'
import { resolveMode } from '@/lib/ai'
import type { HealthResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Reports which provider a round would use, so the UI can show the demo badge.
 * Returns the *mode* only — never the key, never whether a specific key value is
 * valid.
 */
export function GET(_request: NextRequest): Response {
  const body: HealthResponse = {
    status: 'ok',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    provider: resolveMode(),
    version: '0.2.0',
  }

  return Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
