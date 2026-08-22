import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import { CONTENT_ROOT_NAME, getContentSnapshot } from './document'
import { createMemoryCollaborationAdapter } from './memory'
import { createCollaborationServiceFromAdapter } from './service'

const captureUpdates = (doc: Y.Doc) => {
  const updates: Uint8Array[] = []
  doc.on('update', (update) => updates.push(update))
  return updates
}

describe('content collaboration service', () => {
  test('merges incremental client updates without saving the content snapshot', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-1'
    const initialSnapshot = { title: 'hello', _type: 'Article' }
    const clientA = new Y.Doc()
    const clientB = new Y.Doc()

    for (const client of [clientA, clientB]) {
      const initial = await service.sync({
        roomId,
        initialSnapshot,
        stateVector: Y.encodeStateVector(client),
      })
      Y.applyUpdate(client, initial.update)
    }

    const updatesA = captureUpdates(clientA)
    const updatesB = captureUpdates(clientB)
    const titleA = clientA.getMap<unknown>(CONTENT_ROOT_NAME).get('title') as Y.Text
    const titleB = clientB.getMap<unknown>(CONTENT_ROOT_NAME).get('title') as Y.Text
    titleA.insert(0, 'A')
    titleB.insert(titleB.length, 'B')

    await service.sync({
      roomId,
      initialSnapshot,
      update: Y.mergeUpdates(updatesA),
    })
    await service.sync({
      roomId,
      initialSnapshot,
      update: Y.mergeUpdates(updatesB),
    })

    expect(await service.hasUnsavedChanges({ roomId, initialSnapshot })).toBe(true)

    for (const client of [clientA, clientB]) {
      const result = await service.sync({
        roomId,
        initialSnapshot,
        stateVector: Y.encodeStateVector(client),
      })
      Y.applyUpdate(client, result.update)
    }

    expect(getContentSnapshot(clientA)).toEqual(getContentSnapshot(clientB))
    expect(getContentSnapshot(clientA).title).toBe('AhelloB')
  })

  test('marks the exact shared state as saved only after the save callback succeeds', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-2'
    const initialSnapshot = { title: 'before', _type: 'Article' }
    const client = new Y.Doc()
    const initial = await service.sync({
      roomId,
      initialSnapshot,
      stateVector: Y.encodeStateVector(client),
    })
    Y.applyUpdate(client, initial.update)
    const updates = captureUpdates(client)
    const title = client.getMap<unknown>(CONTENT_ROOT_NAME).get('title') as Y.Text
    title.delete(0, title.length)
    title.insert(0, 'after')
    await service.sync({
      roomId,
      initialSnapshot,
      update: Y.mergeUpdates(updates),
    })

    let persisted: Record<string, unknown> | undefined
    await service.snapshot({
      roomId,
      initialSnapshot,
      save: async (snapshot) => {
        persisted = snapshot
        return snapshot
      },
    })

    expect(persisted?.title).toBe('after')
    expect(await service.hasUnsavedChanges({ roomId, initialSnapshot })).toBe(false)
  })
})
