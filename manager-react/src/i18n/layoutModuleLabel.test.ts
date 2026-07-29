import { describe, expect, test } from 'bun:test'
import { translateLayoutModuleLabel } from './layoutModuleLabel'

const createTranslator =
  (messages: Record<string, string>) =>
  (key: string): string =>
    messages[key] ?? key

describe('translateLayoutModuleLabel', () => {
  test('uses the dynamic layout module namespace', () => {
    const t = createTranslator({
      'layoutModule.header': 'Cabecera',
    })

    expect(translateLayoutModuleLabel(t, 'header', 'Header')).toBe('Cabecera')
  })

  test('humanizes the content type name when the key is missing', () => {
    const t = createTranslator({})

    expect(
      translateLayoutModuleLabel(t, 'hero', 'ProjectHero'),
    ).toBe('Project Hero')
  })
})
