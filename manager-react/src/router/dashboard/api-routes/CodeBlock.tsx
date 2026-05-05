'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function CodeBlock({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <pre
      className={cn(
        'bg-muted/40 min-h-64 overflow-auto rounded-xl border p-4 text-xs leading-6 whitespace-pre-wrap break-words',
        className,
      )}
    >
      <code>{children}</code>
    </pre>
  )
}
