import { describe, expect, test } from 'bun:test'

import { mergeConditionFieldState } from './condition-state'

describe('condition field state', () => {
  test('keeps document fields that are outside the current form section', () => {
    expect(
      mergeConditionFieldState(
        {
          title: 'Project title',
          credits: 'Produced by Rakun',
        },
        {
          _iterator: [],
        }
      )
    ).toEqual({
      title: 'Project title',
      credits: 'Produced by Rakun',
      _iterator: [],
    })
  })

  test('prefers live section values over the document snapshot', () => {
    expect(
      mergeConditionFieldState(
        {
          title: 'Old title',
        },
        {
          title: 'Current title',
        }
      )
    ).toEqual({
      title: 'Current title',
    })
  })
})
