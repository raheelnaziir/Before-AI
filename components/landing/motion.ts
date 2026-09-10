/**
 * Motion constants for the introduction page.
 *
 * One easing curve across the whole route — the same one the round UI uses — so
 * the marketing page and the product read as the same piece of software.
 */
export const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Standard scroll-reveal viewport.
 *
 * `once` matters: a section that re-animates every time it crosses the fold
 * reads as a glitch rather than as polish. `amount` stays low so tall blocks
 * still trigger on short viewports.
 */
export const VIEWPORT = { once: true, amount: 0.2 } as const
