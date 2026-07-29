import { describe, expect, test } from 'bun:test'
import {
  extendManagerLanguagePack,
  type ManagerLanguagePack,
} from './uiLocales'

describe('extendManagerLanguagePack', () => {
  test('adds and overrides messages without mutating the base pack', () => {
    const languagePack: ManagerLanguagePack = {
      code: 'es',
      name: 'Español',
      messages: {
        existing: 'Original',
      },
    }

    const extended = extendManagerLanguagePack(languagePack, {
      existing: 'Sobrescrito',
      custom: 'Personalizado',
    })

    expect(extended).toEqual({
      code: 'es',
      name: 'Español',
      messages: {
        existing: 'Sobrescrito',
        custom: 'Personalizado',
      },
    })
    expect(languagePack.messages).toEqual({
      existing: 'Original',
    })
  })
})
