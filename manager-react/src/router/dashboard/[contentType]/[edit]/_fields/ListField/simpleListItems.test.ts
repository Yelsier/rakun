import { describe, expect, test } from 'bun:test'

import { snapshotSimpleListOrder } from './simpleListItems'

describe('generic simple list ordering', () => {
  test('keeps the requested order and snapshots unsaved child values', () => {
    const reordered = [
      { uid: 'second', value: { href: '/old-second', title: 'Second' } },
      { uid: 'first', value: { href: '/old-first', title: 'First' } },
    ]
    const currentValues = {
      first: { href: '/first', title: 'Updated first' },
      second: { href: '/second', title: 'Updated second' },
    }

    expect(
      snapshotSimpleListOrder(reordered, (uid) =>
        currentValues[uid as keyof typeof currentValues],
      ),
    ).toEqual([
      { uid: 'second', value: currentValues.second },
      { uid: 'first', value: currentValues.first },
    ])
  })
})
