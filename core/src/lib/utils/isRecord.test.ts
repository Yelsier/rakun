import { describe, expect, test } from 'bun:test'

import { isRecord } from './isRecord'

describe('isRecord', () => {
  test('accepts non-null, non-array objects', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ value: 1 })).toBe(true)
    expect(isRecord(new Date())).toBe(true)
  })

  test('rejects arrays, null, and primitive values', () => {
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord('value')).toBe(false)
    expect(isRecord(1)).toBe(false)
    expect(isRecord(true)).toBe(false)
  })
})
