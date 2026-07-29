import { describe, expect, test } from 'bun:test'

import {
  createManagerLocaleMap,
  resolveManagerMessage,
} from './resolve'

describe('manager locale extensions', () => {
  test('merges project messages into the built-in English locale', () => {
    const packsByCode = createManagerLocaleMap([
      {
        code: 'en',
        name: 'English',
        messages: {
          'preview.contentTypes.header.menu': 'Headers',
        },
      },
    ])

    expect(
      resolveManagerMessage({
        packsByCode,
        locale: 'en',
        key: 'preview.contentTypes.header.menu',
      }),
    ).toBe('Headers')
    expect(
      resolveManagerMessage({
        packsByCode,
        locale: 'en',
        key: 'common.cancel',
      }),
    ).toBe('Cancel')
  })

  test('keeps English fallbacks for partial project locales', () => {
    const packsByCode = createManagerLocaleMap([
      {
        code: 'es',
        name: 'Español',
        messages: {
          'preview.contentTypes.header.menu': 'Cabeceras',
        },
      },
    ])

    expect(
      resolveManagerMessage({
        packsByCode,
        locale: 'es',
        key: 'preview.contentTypes.header.menu',
      }),
    ).toBe('Cabeceras')
    expect(
      resolveManagerMessage({
        packsByCode,
        locale: 'es',
        key: 'common.cancel',
      }),
    ).toBe('Cancel')
  })
})
