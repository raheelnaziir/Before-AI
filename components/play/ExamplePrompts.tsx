'use client'

import { EXAMPLE_PROMPTS } from './prompts'

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function ExamplePrompts({ onSelect, disabled = false }: ExamplePromptsProps) {
  return (
    <div className="mt-6">
      <p className="mb-3 font-mono text-[11px] tracking-wider text-ink-faint uppercase">
        Or try one
      </p>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(example.prompt)}
            className="group flex items-center gap-2.5 rounded-lg border border-line bg-raised px-3 py-2 text-left text-sm text-ink-muted transition-colors duration-150 hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase transition-colors group-hover:text-signal-dim">
              {example.category}
            </span>
            <span className="text-ink-faint/40" aria-hidden>
              |
            </span>
            {example.label}
          </button>
        ))}
      </div>
    </div>
  )
}
