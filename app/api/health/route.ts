import type { NextRequest } from 'next/server'
import type { HealthResponse } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Liveness check. Deliberately does not touch the AI provider — provider
 * reporting (`mode: 'live' | 'demo'`) arrives with the provider itself on Day 4.
 */
export function GET(_request: NextRequest): Response {
  const body: HealthResponse = {
    status: 'ok',
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    version: '0.1.0',
  }

  return Response.json(body, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
