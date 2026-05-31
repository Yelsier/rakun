'use client'

import { useEffect } from 'react'

type BrowserWindow = Window & {
  __CMS_PAGE_INFO__?: Record<string, unknown>
}

export function PageInfoClientSync(props: {
  value?: Record<string, unknown>
}) {
  const { value } = props

  useEffect(() => {
    ;(window as BrowserWindow).__CMS_PAGE_INFO__ = value
  }, [value])

  return null
}
