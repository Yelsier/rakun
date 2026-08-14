import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { buildStructuredData, StructuredData } from './StructuredData'

describe('StructuredData', () => {
  it('builds Product JSON-LD from mappable fields', () => {
    expect(
      buildStructuredData({
        schemaType: 'Product',
        name: 'Rakun mug',
        sku: 'MUG-1',
        price: 19.9,
        priceCurrency: 'EUR',
        availability: 'InStock',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Rakun mug',
      sku: 'MUG-1',
      offers: {
        '@type': 'Offer',
        price: 19.9,
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      },
    })
  })

  it('escapes script-closing content before rendering', () => {
    const html = renderToStaticMarkup(
      <StructuredData
        schemaType="Custom"
        customJson={'{"@context":"https://schema.org","@type":"Thing","name":"</script>"}'}
      />,
    )

    expect(html).not.toContain('</script></script>')
    expect(html).toContain('\\u003c/script>')
  })

  it('marks invalid custom JSON for preview analysis without injecting markup', () => {
    const html = renderToStaticMarkup(
      <StructuredData schemaType="Custom" customJson={'{"name":"</script><img>"'} />,
    )

    expect(html).toContain('data-rakun-json-ld-invalid=""')
    expect(html).not.toContain('<img>')
  })
})
