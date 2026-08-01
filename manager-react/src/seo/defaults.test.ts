import { describe, expect, test } from 'bun:test'

import { resolveManagerSeoCopy } from './defaults'

describe('resolveManagerSeoCopy', () => {
  test('falls back to English catalog defaults', () => {
    expect(resolveManagerSeoCopy()).toEqual({
      title: 'Rakun Manager',
      description: 'Rakun content management system.',
      robots: 'noindex, nofollow',
    })
  })

  test('uses translated locale messages when provided', () => {
    expect(
      resolveManagerSeoCopy({
        'seo.title': 'Rakun Manager',
        'seo.description': 'Sistema de gestión de contenidos Rakun.',
      }),
    ).toEqual({
      title: 'Rakun Manager',
      description: 'Sistema de gestión de contenidos Rakun.',
      robots: 'noindex, nofollow',
    })
  })
})
