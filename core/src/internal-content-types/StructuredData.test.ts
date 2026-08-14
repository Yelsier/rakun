import { describe, expect, it } from 'bun:test'

import { StructuredData } from './StructuredData'

describe('StructuredData', () => {
  it('accepts typed schema fields used by dynamic data', () => {
    const result = StructuredData.validate({
      _type: StructuredData.name,
      schemaType: 'Product',
      name: {
        _tag: 'Translatable',
        en: 'Rakun mug',
      },
      price: 19.9,
      priceCurrency: 'EUR',
    })

    expect(result.schemaType).toBe('Product')
    expect(result.price).toBe(19.9)
  })

  it('rejects unsupported schema types', () => {
    expect(() =>
      StructuredData.validate({
        _type: StructuredData.name,
        schemaType: 'Unsupported',
      }),
    ).toThrow()
  })
})
