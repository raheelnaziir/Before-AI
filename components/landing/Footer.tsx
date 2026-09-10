import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-line py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="size-1.5 rounded-full bg-signal-dim" />
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-muted uppercase">
            Before&nbsp;AI
          </span>
          <span aria-hidden className="text-ink-faint/40">
            ·
          </span>
          <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            WaitOS · Experience 01
          </span>
        </div>

        <Link
          href="/play"
          className="font-mono text-[10px] tracking-[0.16em] text-ink-faint uppercase transition-colors hover:text-signal"
        >
          Think before the machine does →
        </Link>
      </div>
    </footer>
  )
}
