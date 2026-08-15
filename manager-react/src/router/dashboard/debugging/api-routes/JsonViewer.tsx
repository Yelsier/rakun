'use client'

import { JsonViewer as RakunJsonViewer } from '@rakun-kit/react'

import { cn } from '@/lib/utils'

export function JsonViewer({ value, className }: { value: unknown; className?: string }) {
  return (
    <RakunJsonViewer
      value={value}
      className={cn(
        'bg-muted/40 min-h-64 overflow-auto rounded-xl border p-4 font-mono text-xs leading-6',
        className
      )}
      theme={{
        foreground: 'var(--foreground)',
        muted: 'var(--muted-foreground)',
        accent: 'var(--primary)',
        border: 'var(--border)',
        hover: 'color-mix(in srgb, var(--muted) 60%, transparent)',
      }}
    />
  )
}
