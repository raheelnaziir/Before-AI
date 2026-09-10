'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Route-wide reduced-motion policy.
 *
 * `reducedMotion="user"` makes Framer Motion drop transform and layout
 * animation when the OS asks for it, while keeping opacity — so a revealed
 * section still *appears* instead of silently never arriving. The CSS half of
 * the same rule lives in globals.css; this covers the JS-driven half, which
 * that media query cannot reach.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
