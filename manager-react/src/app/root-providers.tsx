'use client'

import type { ReactNode } from 'react'

import { Toaster } from '@/components/ui/sonner'
import { ManagerThemeProvider } from '@/state/theme'

export type ManagerRootProvidersProps = {
  children: ReactNode
}

export const ManagerRootProviders = ({
  children,
}: ManagerRootProvidersProps) => {
  return (
    <ManagerThemeProvider>
      <Toaster richColors />
      {children}
    </ManagerThemeProvider>
  )
}
