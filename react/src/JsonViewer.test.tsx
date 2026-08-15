import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { JsonViewer } from './JsonViewer'

describe('JsonViewer', () => {
  it('can render with the root collapsed', () => {
    const html = renderToStaticMarkup(
      <JsonViewer value={{ title: 'Rakun', nested: { enabled: true } }} defaultExpandedDepth={-1} />
    )

    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('{...}')
    expect(html).not.toContain('&quot;title&quot;')
  })

  it('opens the root and keeps deeper collections collapsed by default', () => {
    const html = renderToStaticMarkup(
      <JsonViewer value={{ title: 'Rakun', nested: { enabled: true } }} />
    )

    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('&quot;title&quot;')
    expect(html).toContain('&quot;nested&quot;')
    expect(html).toContain('{...}')
    expect(html).not.toContain('&quot;enabled&quot;')
  })
})
