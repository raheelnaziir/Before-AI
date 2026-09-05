import type { AnswerResult, Challenge, Grade } from '../types/index.ts'

/**
 * Shared test fixtures.
 *
 * The challenge here is shaped like a real generated one — a question about the
 * answer's content with defensible distractors — so the reducer and scoring tests
 * exercise the same shape the app does.
 */
export const CHALLENGE: Challenge = {
  id: 'test-challenge',
  question: 'What will it recommend?',
  category: 'technical',
  format: 'multiple_choice',
  model: 'claude-haiku-4-5',
  latencyMs: 880,
  options: [
    {
      id: 'A',
      label: 'Postgres',
      blurb: 'Range queries on a timestamp index are its home turf.',
    },
    {
      id: 'B',
      label: 'MongoDB',
      blurb: 'Append-heavy writes with a flexible document shape.',
    },
    {
      id: 'C',
      label: 'A purpose-built time-series store',
      blurb: 'Neither general-purpose option is the real answer here.',
    },
  ],
}

export const ANSWER: AnswerResult = {
  text: 'Use Postgres. Range queries on a timestamp index are its home turf, and an append-heavy workload is not the bottleneck people assume it is.',
  model: 'claude-opus-5',
  outputTokens: 42,
  latencyMs: 8_400,
}

export const GRADE: Grade = {
  correctOptionId: 'A',
  verdict: 'hit',
  score: 96,
  explanation: 'You picked Postgres, and the answer opened with exactly that.',
  evidenceQuote: 'Range queries on a timestamp index are its home turf',
}
