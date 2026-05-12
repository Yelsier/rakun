'use client'

import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { ManagerThemeProvider, ManagerThemeScript } from '@/state/theme'

export type ManagerRootProvidersProps = {
  children: ReactNode
}

export const ManagerRootProviders = ({
  children,
}: ManagerRootProvidersProps) => {
  return (
    <ManagerThemeProvider>
      <ManagerThemeScript />
      <Toaster richColors />
      {children}
    </ManagerThemeProvider>
  )
}
