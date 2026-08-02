import { describe, expect, test } from 'bun:test'

import { dateTimeToInputValue } from '@/helpers/dateToInputValue'
import { transformDateDefaultData } from '.'

describe('date field default data', () => {
  test('formats serialized values for each HTML date input', () => {
    const date = '2026-08-08T00:00:00.000Z'
    const dateTime = '2026-08-08T16:05:00.000Z'

    expect(transformDateDefaultData(date, 'Date')).toBe('2026-08-08')
    expect(transformDateDefaultData(dateTime, 'DateTime')).toBe(
      dateTimeToInputValue(dateTime, true),
    )
    expect(transformDateDefaultData('18:07:54', 'Time')).toBe('18:07:54')
  })

  test('formats serialized translatable date values', () => {
    expect(
      transformDateDefaultData(
        {
          _tag: 'Translatable',
          en: '2026-08-08T00:00:00.000Z',
          es: '2026-08-09T00:00:00.000Z',
        },
        'Date',
      ),
    ).toEqual({
      _tag: 'Translatable',
      en: '2026-08-08',
      es: '2026-08-09',
    })
  })

  test('uses the UTC calendar day for date-only values', () => {
    expect(dateTimeToInputValue('2026-08-08T23:30:00.000Z')).toBe(
      '2026-08-08',
    )
  })
})
