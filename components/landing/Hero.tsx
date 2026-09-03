import { Badge } from '@/components/ui/Badge'

export function Hero() {
  return (
    <header className="flex flex-col items-center text-center">
      <Badge className="mb-8">Commons · Make Waiting for AI Fun</Badge>

      <h1 className="text-5xl font-semibold tracking-[-0.03em] text-ink sm:text-6xl lg:text-7xl">
        Before AI
      </h1>

      <p className="mt-5 text-xl text-balance text-ink-muted sm:text-2xl">
        Think before the machine does.
      </p>

      <p className="mt-7 max-w-xl text-balance leading-relaxed text-ink-faint">
        Every AI request has a waiting state. Before AI turns that waiting time
        into a prediction challenge — about your own prompt.
      </p>
    </header>
  )
}
