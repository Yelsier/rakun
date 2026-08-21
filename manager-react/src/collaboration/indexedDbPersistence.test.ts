import { afterEach, describe, expect, test } from 'bun:test'
import 'fake-indexeddb/auto'
import { clearDocument, IndexeddbPersistence, storeState } from 'y-indexeddb'
import * as Y from 'yjs'

import { SAVED_STATE_VECTOR_KEY } from './ContentCollaborationProvider'
import { getContentSnapshot, setContentField } from './yDocument'

const roomName = 'rakun:test-user:content:Article:article-1'

afterEach(async () => {
  await clearDocument(roomName)
})

describe('local Yjs persistence', () => {
  test('restores offline field updates and the last saved state vector', async () => {
    const firstDoc = new Y.Doc()
    const firstPersistence = new IndexeddbPersistence(roomName, firstDoc)
    await firstPersistence.whenSynced

    setContentField(firstDoc, 'title', 'stored locally', 'local')
    const savedStateVector = Y.encodeStateVector(firstDoc)
    await firstPersistence.set(
      SAVED_STATE_VECTOR_KEY,
      new Uint8Array(savedStateVector).buffer,
    )
    await storeState(firstPersistence, true)
    await firstPersistence.destroy()

    const restoredDoc = new Y.Doc()
    const restoredPersistence = new IndexeddbPersistence(roomName, restoredDoc)
    await restoredPersistence.whenSynced

    expect(getContentSnapshot(restoredDoc).title).toBe('stored locally')
    const restoredVector = await restoredPersistence.get(SAVED_STATE_VECTOR_KEY)
    expect(new Uint8Array(restoredVector as ArrayBuffer)).toEqual(savedStateVector)

    await restoredPersistence.destroy()
  })
})
