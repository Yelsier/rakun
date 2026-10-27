import { describe, expect, test } from 'bun:test'

import { snapshotSimpleListOrder, snapshotSimpleListValues } from './simpleListItems'

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
      snapshotSimpleListOrder(reordered, (uid) => currentValues[uid as keyof typeof currentValues])
    ).toEqual([
      { uid: 'second', value: currentValues.second },
      { uid: 'first', value: currentValues.first },
    ])
  })

  test('round-trips header links through shared state without wrapping their values', () => {
    const links = [
      { href: '/', title: 'Home' },
      { routeId: 'category-route', contentTypeId: 'assistant', title: 'Assistant' },
    ]
    const rows = links.map((value, index) => ({ uid: `row-${index}`, value }))
    const changedLink = { href: '/contact', title: 'Contact' }
    const sharedState = snapshotSimpleListValues(rows, (uid) =>
      uid === 'row-0' ? changedLink : undefined
    )

    expect(sharedState).toEqual([changedLink, links[1]])
    const reopenedRows = sharedState.map((value, index) => ({ uid: `new-${index}`, value }))
    expect(snapshotSimpleListValues(reopenedRows, () => undefined)).toEqual(sharedState)
  })

  test('preserves explicit cleared values and pending child defaults', () => {
    expect(
      snapshotSimpleListValues(
        [
          { uid: 'pending', value: 'saved' },
          { uid: 'cleared', value: 'old' },
        ],
        (uid) => (uid === 'cleared' ? '' : undefined)
      )
    ).toEqual(['saved', ''])
  })
})
