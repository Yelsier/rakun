import { describe, expect, test } from 'bun:test'

import { normalizeControlledInputValue } from './input'

describe('Input', () => {
  test('keeps explicitly controlled values defined', () => {
    expect(normalizeControlledInputValue({ value: null as never })).toEqual({
      value: '',
    })
    expect(normalizeControlledInputValue({ value: undefined })).toEqual({
      value: '',
    })
  })

  test('leaves uncontrolled inputs unchanged', () => {
    const props = { defaultValue: 'Initial value' }

    expect(normalizeControlledInputValue(props)).toBe(props)
  })
})
