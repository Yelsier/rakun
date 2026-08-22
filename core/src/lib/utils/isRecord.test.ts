import { describe, expect, test } from 'bun:test'

import { isRecord } from './isRecord'

describe('isRecord', () => {
  test('accepts record objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ value: 1 })).toBe(true)
  })

  test('rejects dates, arrays, null, and primitive values', () => {
    expect(isRecord(new Date())).toBe(false)
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord('value')).toBe(false)
    expect(isRecord(1)).toBe(false)
    expect(isRecord(true)).toBe(false)
  })
})
