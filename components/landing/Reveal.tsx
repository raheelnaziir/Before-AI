'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE, VIEWPORT } from './motion'

interface RevealProps {
  children: ReactNode
  /** Stagger offset within a group, in seconds. */
  delay?: number
  className?: string
}

/**
 * Scroll-triggered entrance.
 *
 * Deliberately one shared primitive rather than per-section variants — the whole
 * page moving the same distance at the same speed is what stops a long scroll
 * from feeling like a sequence of unrelated templates.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
