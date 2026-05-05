'use client'

import type { ToasterProps } from 'sonner'
import { Toaster as Sonner } from 'sonner'

import { useManagerTheme } from '@/state/theme'

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useManagerTheme()

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
