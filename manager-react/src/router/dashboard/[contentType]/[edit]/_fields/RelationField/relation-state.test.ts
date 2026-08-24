import { describe, expect, test } from 'bun:test'

import { createNewRelationState } from './relation-state'

describe('new relation state', () => {
  test('keeps the content type discriminator in collaborative snapshots', () => {
    expect(
      createNewRelationState('Hero', {
        title: 'Hello',
      }),
    ).toEqual({
      type: 'new',
      data: {
        _type: 'Hero',
        title: 'Hello',
      },
    })
  })
})
