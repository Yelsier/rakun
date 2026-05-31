import type { ReactNode } from 'react'

import { getCurrentPageInfo } from './pageInfoStore'
import { PageInfoClientSync } from './PageInfoClientSync'

const pageInfoScriptEscapes: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

const serializePageInfo = (value?: Record<string, unknown>) =>
  JSON.stringify(value ?? null).replace(
    /[<>&\u2028\u2029]/g,
    (char) => pageInfoScriptEscapes[char] ?? char,
  )

export function PageInfoProvider(props: {
  value?: Record<string, unknown>
  children: ReactNode
}) {
  const { value, children } = props
  const serializedValue = serializePageInfo(value)

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__CMS_PAGE_INFO__ = ${serializedValue};`,
        }}
      />
      <PageInfoClientSync value={value} />
      {children}
    </>
  )
}

export const usePageInfo = (): Record<string, unknown> | undefined =>
  getCurrentPageInfo()
