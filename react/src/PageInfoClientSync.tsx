'use client'

import { useEffect } from 'react'

type BrowserWindow = Window & {
  __CMS_PAGE_INFO__?: Record<string, unknown>
  __CMS_PAGE_LITERALS__?: Record<string, string>
}

export function PageInfoClientSync(props: {
  value?: Record<string, unknown>
  literals?: Record<string, string>
}) {
  const { value, literals } = props

  useEffect(() => {
    ;(window as BrowserWindow).__CMS_PAGE_INFO__ = value
    ;(window as BrowserWindow).__CMS_PAGE_LITERALS__ = literals
  }, [value, literals])

  return null
}
