'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'

import { cn } from '@/lib/utils'

export type EditableCodeBlockRef = {
  getValue: () => string
}

export const EditableCodeBlock = forwardRef<
  EditableCodeBlockRef,
  {
    children?: string
    className?: string
  }
>(function EditableCodeBlock({ children = '', className }, ref) {
  const [value, setValue] = useState(children)

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => value,
    }),
    [value],
  )

  return (
    <textarea
      className={cn(
        'bg-muted/40 min-h-64 w-full resize-y rounded-xl border p-4 font-mono text-xs leading-6 outline-none',
        className,
      )}
      spellCheck={false}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
})
