import type { ReactNode } from 'react'

import { PageInfoClientProvider } from './PageInfoClientProvider'
import { getCurrentPageInfo, setCurrentPageInfo, setCurrentPageLiterals } from './pageInfoStore'

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
    (char) => pageInfoScriptEscapes[char] ?? char
  )

export function PageInfoProvider(props: {
  value?: Record<string, unknown>
  literals?: Record<string, string>
  serialize?: boolean
  children: ReactNode
}) {
  const { value, literals, serialize = true, children } = props
  setCurrentPageInfo(value)
  setCurrentPageLiterals(literals)

  return (
    <>
      {serialize ? (
        <>
          <template
            data-rakun-page-info=""
            dangerouslySetInnerHTML={{ __html: serializePageInfo(value) }}
          />
          <template
            data-rakun-page-literals=""
            dangerouslySetInnerHTML={{ __html: serializePageInfo(literals) }}
          />
        </>
      ) : null}
      <PageInfoClientProvider value={value} literals={literals}>
        {children}
      </PageInfoClientProvider>
    </>
  )
}

export const usePageInfo = (): Record<string, unknown> | undefined => getCurrentPageInfo()
