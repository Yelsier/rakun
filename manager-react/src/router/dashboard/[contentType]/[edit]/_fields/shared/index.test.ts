import { describe, expect, test } from 'bun:test'

import { isPrimitiveData } from '.'

describe('field default data', () => {
  test('does not treat null as a primitive field value', () => {
    expect(isPrimitiveData(null as never)).toBe(false)
    expect(isPrimitiveData(undefined)).toBe(false)
    expect(isPrimitiveData('')).toBe(true)
    expect(isPrimitiveData(0)).toBe(true)
    expect(isPrimitiveData(false)).toBe(true)
  })
})
