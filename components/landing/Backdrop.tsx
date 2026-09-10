/**
 * Fixed ambient layer behind the whole introduction page.
 *
 * Three cheap parts, no images: a masked engineering grid, two large radial
 * glows, and a grain overlay that kills the banding those glows would otherwise
 * show on a dark panel. Only one element animates, and only its transform, so
 * the whole backdrop stays on the compositor.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-void"
    >
      <div className="grid-lines absolute inset-0 opacity-60" />

      {/* Cyan wash behind the hero. */}
      <div
        className="animate-glow-drift absolute top-[-26rem] left-1/2 h-[46rem] w-[min(84rem,150vw)] -translate-x-1/2 will-change-transform"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--color-signal) 12%, transparent), transparent 72%)',
        }}
      />

      {/* Violet counterweight, held still so the two never beat against each other. */}
      <div
        className="absolute top-[6rem] right-[-16rem] h-[38rem] w-[38rem]"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--color-violet) 9%, transparent), transparent 70%)',
        }}
      />

      <div className="noise-layer absolute inset-0" />
    </div>
  )
}
