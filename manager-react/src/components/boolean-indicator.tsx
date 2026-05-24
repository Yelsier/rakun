import { Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'

type BooleanIndicatorProps = {
  value: boolean
  className?: string
}

export function BooleanIndicator({ value, className }: BooleanIndicatorProps) {
  const Icon = value ? Check : X
  const label = value ? 'Yes' : 'No'

  return (
    <span
      aria-label={label}
      className={cn('ml-2 flex items-center', className)}
      title={label}
    >
      <span
        className={cn(
          'rounded-full border p-1',
          value
            ? 'border-primary text-primary'
            : 'border-destructive text-destructive',
        )}
      >
        <Icon aria-hidden="true" size={12} />
      </span>
    </span>
  )
}
