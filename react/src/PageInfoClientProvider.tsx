'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'

import { setCurrentPageInfo, type PageInfo } from './pageInfoStore'

const PageInfoContext = createContext<PageInfo>(undefined)

export function PageInfoClientProvider({
  value,
  children,
}: {
  value?: Record<string, unknown>
  children: ReactNode
}) {
  useEffect(() => {
    setCurrentPageInfo(value)
  }, [value])

  return (
    <PageInfoContext.Provider value={value}>
      {children}
    </PageInfoContext.Provider>
  )
}

export const useClientPageInfo = (): PageInfo => useContext(PageInfoContext)
