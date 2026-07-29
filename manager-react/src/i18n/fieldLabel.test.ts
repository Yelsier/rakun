import { describe, expect, test } from 'bun:test'
import { translateFieldLabel } from './fieldLabel'

const createTranslator =
  (messages: Record<string, string>) =>
  (key: string): string =>
    messages[key] ?? key

describe('translateFieldLabel', () => {
  test('uses the dynamic field namespace first', () => {
    const t = createTranslator({
      'field.title': 'Título del proyecto',
      'fields.title': 'Título',
    })

    expect(translateFieldLabel(t, 'title')).toBe('Título del proyecto')
  })

  test('supports legacy manager labels and humanized fallbacks', () => {
    const t = createTranslator({
      'fields.title': 'Título',
    })

    expect(translateFieldLabel(t, 'title')).toBe('Título')
    expect(translateFieldLabel(t, 'heroTitle')).toBe('Hero Title')
  })
})
