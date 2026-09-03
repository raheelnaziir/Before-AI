const STEPS = [
  {
    n: '01',
    title: 'You ask',
    body: 'Your prompt goes to the AI. The request starts immediately — nothing is faked.',
  },
  {
    n: '02',
    title: 'You predict',
    body: 'While it works, you get a challenge built from your prompt. Commit to an answer.',
  },
  {
    n: '03',
    title: 'You find out',
    body: 'The answer lands next to your prediction. You get a score, and a calibration profile.',
  },
] as const

export function HowItWorks() {
  return (
    <section className="mt-24" aria-labelledby="how-it-works">
      <h2 id="how-it-works" className="sr-only">
        How it works
      </h2>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="bg-base p-6">
            <span className="font-mono text-[11px] tracking-wider text-signal-dim">
              {step.n}
            </span>
            <h3 className="mt-3 text-sm font-medium text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-faint">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
