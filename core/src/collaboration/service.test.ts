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

  test('discards shared edits and returns the restored saved snapshot', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-discard'
    const initialSnapshot = { title: 'saved', summary: 'keep' }
    const client = new Y.Doc()
    const initial = await service.sync({
      roomId,
      initialSnapshot,
      stateVector: Y.encodeStateVector(client),
    })
    Y.applyUpdate(client, initial.update)
    const updates = captureUpdates(client)
    const root = client.getMap<unknown>(CONTENT_ROOT_NAME)
    const title = root.get('title') as Y.Text
    title.delete(0, title.length)
    title.insert(0, 'edited')
    root.delete('summary')
    root.set('temporary', new Y.Text('remove'))
    await service.sync({
      roomId,
      initialSnapshot,
      update: Y.mergeUpdates(updates),
    })

    const discarded = await service.discard({
      roomId,
      initialSnapshot,
      stateVector: Y.encodeStateVector(client),
    })
    Y.applyUpdate(client, discarded.update)

    expect(getContentSnapshot(client)).toEqual(initialSnapshot)
    expect(await service.hasUnsavedChanges({ roomId, initialSnapshot })).toBe(false)
  })

  test('tracks presence by browser tab even when tabs belong to the same user', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-presence'
    const initialSnapshot = { title: 'hello' }
    const participant = {
      active: true,
      userId: 'user-1',
      user: 'editor@example.com',
      name: 'Editor',
    }

    await service.sync({
      roomId,
      initialSnapshot,
      presence: { ...participant, clientId: 'tab-1', fieldId: 'Article.title' },
    })
    const joined = await service.sync({
      roomId,
      initialSnapshot,
      presence: { ...participant, clientId: 'tab-2' },
    })

    expect(joined.presence.map(({ clientId }) => clientId).sort()).toEqual([
      'tab-1',
      'tab-2',
    ])
    expect(joined.presence.find(({ clientId }) => clientId === 'tab-1')?.fieldId).toBe(
      'Article.title',
    )

    const left = await service.sync({
      roomId,
      initialSnapshot,
      presence: { ...participant, active: false, clientId: 'tab-1' },
    })
    expect(left.presence.map(({ clientId }) => clientId)).toEqual(['tab-2'])
    expect(left.presenceChanged).toBe(true)
  })

  test('keeps presence alive through SSE connections and removes only the last one', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-sse-presence'
    const initialSnapshot = { title: 'hello' }
    const participant = {
      clientId: 'tab-1',
      userId: 'user-1',
      user: 'editor@example.com',
      name: 'Editor',
    }

    await service.sync({
      roomId,
      initialSnapshot,
      presence: { ...participant, active: true, fieldId: 'Article.title' },
    })
    await service.setPresenceConnection({
      roomId,
      connectionId: 'sse-1',
      participant,
      active: true,
    })
    await service.setPresenceConnection({
      roomId,
      connectionId: 'sse-2',
      participant,
      active: true,
    })

    expect(
      await service.setPresenceConnection({
        roomId,
        connectionId: 'sse-1',
        participant,
        active: false,
      }),
    ).toBe(false)
    expect(
      await service.setPresenceConnection({
        roomId,
        connectionId: 'sse-2',
        participant,
        active: false,
      }),
    ).toBe(true)
  })

  test('does not let another user take over an active client id', async () => {
    const service = createCollaborationServiceFromAdapter({
      adapter: createMemoryCollaborationAdapter(),
    })
    const roomId = 'content:Article:article-presence-owner'
    const initialSnapshot = { title: 'hello' }

    await service.sync({
      roomId,
      initialSnapshot,
      presence: {
        active: true,
        clientId: 'shared-client-id',
        userId: 'user-1',
        user: 'first@example.com',
      },
    })
    const attemptedTakeover = await service.sync({
      roomId,
      initialSnapshot,
      presence: {
        active: true,
        clientId: 'shared-client-id',
        userId: 'user-2',
        user: 'second@example.com',
      },
    })

    expect(attemptedTakeover.presence).toEqual([
      expect.objectContaining({
        clientId: 'shared-client-id',
        userId: 'user-1',
      }),
    ])

    const attemptedRemoval = await service.sync({
      roomId,
      initialSnapshot,
      presence: {
        active: false,
        clientId: 'shared-client-id',
        userId: 'user-2',
        user: 'second@example.com',
      },
    })
    expect(attemptedRemoval.presence).toEqual([
      expect.objectContaining({
        clientId: 'shared-client-id',
        userId: 'user-1',
      }),
    ])
  })
})
