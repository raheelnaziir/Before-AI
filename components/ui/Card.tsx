import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Raised surface with a hairline border and a 1px top highlight. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-raised edge-light',
        className,
      )}
      {...props}
    />
  )
}
