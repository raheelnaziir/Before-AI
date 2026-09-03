'use client'

import { type KeyboardEvent, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

/** Guard rail, not a hard product limit — prompts this long aren't predictable anyway. */
export const MAX_PROMPT_LENGTH = 1000

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmed = value.trim()
  const canSubmit = trimmed.length > 0 && !disabled
  // Only surface the counter once it's close to mattering.
  const showCount = value.length > MAX_PROMPT_LENGTH * 0.7

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter submits. Plain Enter stays a newline — people write
    // multi-line prompts, and losing one to a stray keypress is infuriating.
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSubmit) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <Card className="overflow-hidden transition-colors duration-200 focus-within:border-line-strong">
      <label htmlFor="prompt" className="sr-only">
        Your prompt
      </label>

      <textarea
        id="prompt"
        ref={textareaRef}
        value={value}
        rows={3}
        maxLength={MAX_PROMPT_LENGTH}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything — then predict what the machine will say."
        className="max-h-64 min-h-[104px] w-full resize-none bg-transparent px-5 pt-5 pb-2 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-faint disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3">
        <p className="font-mono text-[11px] text-ink-faint">
          {showCount ? (
            <span className={value.length >= MAX_PROMPT_LENGTH ? 'text-signal' : ''}>
              {value.length} / {MAX_PROMPT_LENGTH}
            </span>
          ) : (
            <>
              <kbd className="font-mono">⌘</kbd>
              <span className="mx-1">+</span>
              <kbd className="font-mono">↵</kbd>
              <span className="ml-2 text-ink-faint/70">to send</span>
            </>
          )}
        </p>

        <Button onClick={onSubmit} disabled={!canSubmit}>
          Ask AI
          <span aria-hidden>→</span>
        </Button>
      </div>
    </Card>
  )
}
