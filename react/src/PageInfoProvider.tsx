import type { ReactNode } from 'react'

import { PageInfoClientProvider } from './PageInfoClientProvider'
import {
  getCurrentPageInfo,
  setCurrentPageInfo,
  setCurrentPageLiterals,
} from './pageInfoStore'

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
  literals?: Record<string, string>
  children: ReactNode
}) {
  const { value, literals, children } = props
  const serializedValue = serializePageInfo(value)
  const serializedLiterals = serializePageInfo(literals)
  setCurrentPageInfo(value)
  setCurrentPageLiterals(literals)

  return (
    <>
      <template
        data-rakun-page-info=""
        dangerouslySetInnerHTML={{
          __html: serializedValue,
        }}
      />
      <template
        data-rakun-page-literals=""
        dangerouslySetInnerHTML={{
          __html: serializedLiterals,
        }}
      />
      <PageInfoClientProvider value={value} literals={literals}>
        {children}
      </PageInfoClientProvider>
    </>
  )
}

export const usePageInfo = (): Record<string, unknown> | undefined =>
  getCurrentPageInfo()
