'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'

import {
  setCurrentPageInfo,
  setCurrentPageLiterals,
  type PageInfo,
  type PageLiterals,
} from './pageInfoStore'

const PageRuntimeContext = createContext<{
  info: PageInfo
  literals: PageLiterals
}>({ info: undefined, literals: undefined })

export function PageInfoClientProvider({
  value,
  literals,
  children,
}: {
  value?: Record<string, unknown>
  literals?: Record<string, string>
  children: ReactNode
}) {
  useEffect(() => {
    setCurrentPageInfo(value)
    setCurrentPageLiterals(literals)
  }, [value, literals])

  return (
    <PageRuntimeContext.Provider value={{ info: value, literals }}>
      {children}
    </PageRuntimeContext.Provider>
  )
}

export const useClientPageInfo = (): PageInfo => useContext(PageRuntimeContext).info
export const useClientPageLiterals = (): PageLiterals =>
  useContext(PageRuntimeContext).literals
