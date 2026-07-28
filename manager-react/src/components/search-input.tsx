'use client'

import { Search } from 'lucide-react'
import type * as React from 'react'

import { Input } from './ui/input'

import { cn } from '@/lib/utils'

export type SearchInputProps = Omit<React.ComponentProps<typeof Input>, 'className' | 'type'> & {
  className?: string
  inputClassName?: string
  iconClassName?: string
}

export const SearchInput = ({
  className,
  inputClassName,
  iconClassName,
  ...props
}: SearchInputProps) => (
  <div
    className={cn(
      'flex h-10 w-full min-w-0 items-center gap-2 rounded-md border bg-card pl-2.5 pr-1 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
      className
    )}
  >
    <Search className={cn('size-4 shrink-0 text-muted-foreground', iconClassName)} />
    <Input
      type="text"
      className={cn(
        'h-8 min-w-0 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:ring-0',
        inputClassName
      )}
      {...props}
    />
  </div>
)
