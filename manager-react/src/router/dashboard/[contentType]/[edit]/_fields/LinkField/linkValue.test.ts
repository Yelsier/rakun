import { describe, expect, test } from 'bun:test'

import { transformLinkDefaultData } from './linkValue'

describe('link field default values', () => {
  test('normalizes persisted legacy URLs to titled direct links', () => {
    expect(transformLinkDefaultData('/docs/')).toEqual({
      href: '/docs/',
      title: '',
    })
  })

  test('normalizes legacy URLs inside translated values', () => {
    expect(
      transformLinkDefaultData({
        _tag: 'Translatable',
        en: '/docs/',
        es: { href: '/documentacion/', title: 'Docs' },
      }),
    ).toEqual({
      _tag: 'Translatable',
      en: { href: '/docs/', title: '' },
      es: { href: '/documentacion/', title: 'Docs' },
    })
  })
})
