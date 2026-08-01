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
}: SearchInputProps) => {
  const dataTour =
    'data-tour' in props
      ? (props as { 'data-tour'?: string })['data-tour']
      : undefined
  const { 'data-tour': _dataTour, ...inputProps } = props as SearchInputProps & {
    'data-tour'?: string
  }

  return (
    <div
      data-tour={dataTour}
      className={cn(
        'flex h-9 w-full min-w-0 items-stretch gap-2 overflow-hidden rounded-md border bg-card pl-2.5 pr-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className
      )}
    >
      <Search
        className={cn('size-4 shrink-0 self-center text-muted-foreground', iconClassName)}
      />
      <Input
        type="text"
        className={cn(
          'h-auto min-h-0 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-0 shadow-none dark:bg-transparent focus-visible:border-0 focus-visible:ring-0',
          inputClassName
        )}
        {...inputProps}
      />
    </div>
  )
}
