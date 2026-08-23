import { describe, expect, test } from 'bun:test'

import { dispatchConditionFieldStateChange, mergeConditionFieldState } from './condition-state'

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

  test('bubbles nested field changes to the parent form', () => {
    const calls: string[] = []

    dispatchConditionFieldStateChange({
      fieldId: 'Page._template.module-1.hero.title',
      onFieldStateChange: (fieldId) => calls.push(`nested:${fieldId}`),
      parentOnFieldStateChange: (fieldId) => calls.push(`parent:${fieldId}`),
      state: 'Hello',
    })

    expect(calls).toEqual([
      'nested:Page._template.module-1.hero.title',
      'parent:Page._template.module-1.hero.title',
    ])
  })
})
