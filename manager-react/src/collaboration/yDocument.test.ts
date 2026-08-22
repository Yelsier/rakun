import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import { getContentSnapshot, setContentField } from './yDocument'

describe('manager Yjs field bindings', () => {
  test('maps concurrent text edits to the shared Y.Text', () => {
    const first = new Y.Doc()
    const second = new Y.Doc()
    setContentField(first, 'title', 'hello', 'seed')
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first))
    const firstBaseline = Y.encodeStateVector(first)
    const secondBaseline = Y.encodeStateVector(second)

    setContentField(first, 'title', 'Xhello', 'local')
    setContentField(second, 'title', 'helloY', 'local')
    const firstUpdate = Y.encodeStateAsUpdate(first, firstBaseline)
    const secondUpdate = Y.encodeStateAsUpdate(second, secondBaseline)
    Y.applyUpdate(first, secondUpdate)
    Y.applyUpdate(second, firstUpdate)

    expect(getContentSnapshot(first)).toEqual(getContentSnapshot(second))
    expect(getContentSnapshot(first).title).toBe('XhelloY')
  })

  test('keeps concurrent shared-template module additions', () => {
    const first = new Y.Doc()
    const second = new Y.Doc()
    const contentSlot = { _id: 'content-slot', _type: 'TemplateContent' }
    setContentField(first, '_template', [contentSlot], 'seed')
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first))
    const firstBaseline = Y.encodeStateVector(first)
    const secondBaseline = Y.encodeStateVector(second)

    setContentField(
      first,
      '_template',
      [contentSlot, { _id: 'hero', _type: 'Hero' }],
      'local',
    )
    setContentField(
      second,
      '_template',
      [contentSlot, { _id: 'footer', _type: 'Footer' }],
      'local',
    )
    const firstUpdate = Y.encodeStateAsUpdate(first, firstBaseline)
    const secondUpdate = Y.encodeStateAsUpdate(second, secondBaseline)
    Y.applyUpdate(first, secondUpdate)
    Y.applyUpdate(second, firstUpdate)

    expect(getContentSnapshot(first)).toEqual(getContentSnapshot(second))
    const modules = getContentSnapshot(first)._template as Array<{ _id: string }>
    expect(modules.map((module) => module._id).sort()).toEqual([
      'content-slot',
      'footer',
      'hero',
    ])
  })
})
