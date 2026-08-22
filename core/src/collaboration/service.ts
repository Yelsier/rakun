import { equalFlat } from 'lib0/array'
import * as Y from 'yjs'

import { getContentSnapshot, initializeContentDocument } from './document'
import type {
  CollaborationAdapter,
  CollaborationRoomState,
  CollaborationServiceConfig,
} from './types'

type CollaborationRoom = {
  doc: Y.Doc
  savedStateVector: Uint8Array
}

const storedState = (room: CollaborationRoom): CollaborationRoomState => ({
  update: Y.encodeStateAsUpdate(room.doc),
  savedStateVector: room.savedStateVector,
})

export type CollaborationSyncResult = {
  update: Uint8Array
  savedStateVector: Uint8Array
}

export interface CollaborationService {
  rawAdapter: CollaborationAdapter
  sync: (input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
    stateVector?: Uint8Array
    update?: Uint8Array
  }) => Promise<CollaborationSyncResult>
  snapshot: <T>(input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
    save: (snapshot: Record<string, unknown>) => Promise<T>
  }) => Promise<{ result: T; savedStateVector: Uint8Array }>
  hasUnsavedChanges: (input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
  }) => Promise<boolean>
  delete: (roomId: string) => Promise<void>
}

export const createCollaborationServiceFromAdapter = (
  config: CollaborationServiceConfig,
): CollaborationService => {
  const rooms = new Map<string, Promise<CollaborationRoom>>()
  const locks = new Map<string, Promise<void>>()

  const loadRoom = (
    roomId: string,
    initialSnapshot: Record<string, unknown>,
  ): Promise<CollaborationRoom> => {
    const existing = rooms.get(roomId)
    if (existing) return existing

    const loading = (async () => {
      const persisted = await config.adapter.load(roomId)
      const doc = new Y.Doc()
      if (persisted) {
        Y.applyUpdate(doc, persisted.update)
        return { doc, savedStateVector: persisted.savedStateVector }
      }

      initializeContentDocument(doc, initialSnapshot)
      const room = { doc, savedStateVector: Y.encodeStateVector(doc) }
      await config.adapter.save(roomId, storedState(room))
      return room
    })()

    rooms.set(roomId, loading)
    loading.catch(() => rooms.delete(roomId))
    return loading
  }

  const withLock = async <T>(roomId: string, run: () => Promise<T>): Promise<T> => {
    const previous = locks.get(roomId) ?? Promise.resolve()
    let release: () => void = () => undefined
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    const queued = previous.then(() => current)
    locks.set(roomId, queued)
    await previous

    try {
      return await run()
    } finally {
      release()
      if (locks.get(roomId) === queued) locks.delete(roomId)
    }
  }

  return {
    rawAdapter: config.adapter,
    sync: async ({ roomId, initialSnapshot, stateVector, update }) =>
      await withLock(roomId, async () => {
        const room = await loadRoom(roomId, initialSnapshot)
        if (update?.length) {
          Y.applyUpdate(room.doc, update)
          await config.adapter.save(roomId, storedState(room))
        }

        return {
          update: stateVector
            ? Y.encodeStateAsUpdate(room.doc, stateVector)
            : Y.encodeStateAsUpdate(room.doc),
          savedStateVector: room.savedStateVector,
        }
      }),
    snapshot: async ({ roomId, initialSnapshot, save }) =>
      await withLock(roomId, async () => {
        const room = await loadRoom(roomId, initialSnapshot)
        const result = await save(getContentSnapshot(room.doc))
        room.savedStateVector = Y.encodeStateVector(room.doc)
        await config.adapter.save(roomId, storedState(room))
        return { result, savedStateVector: room.savedStateVector }
      }),
    hasUnsavedChanges: async ({ roomId, initialSnapshot }) => {
      const room = await loadRoom(roomId, initialSnapshot)
      return !equalFlat(Y.encodeStateVector(room.doc), room.savedStateVector)
    },
    delete: async (roomId) =>
      await withLock(roomId, async () => {
        rooms.delete(roomId)
        await config.adapter.delete?.(roomId)
      }),
  }
}
