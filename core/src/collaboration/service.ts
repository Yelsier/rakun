import { equalFlat } from 'lib0/array'
import * as Y from 'yjs'

import {
  getContentSnapshot,
  initializeContentDocument,
  replaceContentSnapshot,
} from './document'
import type {
  CollaborationAdapter,
  CollaborationPresence,
  CollaborationPresenceState,
  CollaborationRoomState,
  CollaborationServiceConfig,
} from './types'

const PRESENCE_TTL_MS = 45_000

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
  presence: CollaborationPresence[]
  presenceChanged: boolean
}

export interface CollaborationService {
  rawAdapter: CollaborationAdapter
  sync: (input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
    stateVector?: Uint8Array
    update?: Uint8Array
    presence?: CollaborationPresence & { active: boolean }
  }) => Promise<CollaborationSyncResult>
  setPresenceConnection: (input: {
    roomId: string
    connectionId: string
    participant: CollaborationPresence
    active: boolean
  }) => Promise<boolean>
  snapshot: <T>(input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
    save: (snapshot: Record<string, unknown>) => Promise<T>
  }) => Promise<{ result: T; savedStateVector: Uint8Array }>
  discard: (input: {
    roomId: string
    initialSnapshot: Record<string, unknown>
    stateVector?: Uint8Array
  }) => Promise<{ update: Uint8Array; savedStateVector: Uint8Array }>
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
  const localPresence = new Map<string, CollaborationPresenceState[]>()
  const locks = new Map<string, Promise<void>>()
  const hasSharedPresence = Boolean(
    config.adapter.loadPresence && config.adapter.savePresence,
  )

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

  const syncPresence = async (
    roomId: string,
    update?: CollaborationPresence & { active: boolean },
  ) => {
    const now = Date.now()
    const stored = hasSharedPresence
      ? (await config.adapter.loadPresence?.(roomId)) ?? []
      : localPresence.get(roomId) ?? []
    const active = stored.filter(
      (participant) => now - participant.lastSeenAt <= PRESENCE_TTL_MS,
    )
    const previous = active.find(
      (participant) => participant.clientId === update?.clientId,
    )
    let changed = active.length !== stored.length

    if (update) {
      const previousIndex = active.findIndex(
        (participant) => participant.clientId === update.clientId,
      )
      const next = active.slice()
      if (previous && previous.userId !== update.userId) {
        return {
          changed,
          presence: active.map(
            ({ lastSeenAt: _lastSeenAt, connectionIds: _connectionIds, ...participant }) =>
              participant,
          ),
        }
      }

      if (update.active) {
        const { active: _active, ...participant } = update
        const nextParticipant = {
          ...participant,
          connectionIds: previous?.connectionIds,
          lastSeenAt: now,
        }
        if (previousIndex >= 0) next[previousIndex] = nextParticipant
        else next.push(nextParticipant)
        changed ||=
          !previous ||
          previous.userId !== participant.userId ||
          previous.user !== participant.user ||
          previous.name !== participant.name ||
          previous.fieldId !== participant.fieldId ||
          previous.avatar?.url !== participant.avatar?.url ||
          previous.avatar?.previewUrl !== participant.avatar?.previewUrl
      } else {
        if (previousIndex >= 0) next.splice(previousIndex, 1)
        changed ||= Boolean(previous)
      }
      active.splice(0, active.length, ...next)
    }

    if (hasSharedPresence) {
      await config.adapter.savePresence?.(roomId, active)
    } else {
      localPresence.set(roomId, active)
    }

    return {
      changed,
      presence: active.map(
        ({ lastSeenAt: _lastSeenAt, connectionIds: _connectionIds, ...participant }) =>
          participant,
      ),
    }
  }

  const setPresenceConnection = async ({
    roomId,
    connectionId,
    participant,
    active: connectionActive,
  }: {
    roomId: string
    connectionId: string
    participant: CollaborationPresence
    active: boolean
  }) => {
    const now = Date.now()
    const stored = hasSharedPresence
      ? (await config.adapter.loadPresence?.(roomId)) ?? []
      : localPresence.get(roomId) ?? []
    const active = stored.filter(
      (current) => now - current.lastSeenAt <= PRESENCE_TTL_MS,
    )
    const participantIndex = active.findIndex(
      (current) => current.clientId === participant.clientId,
    )
    const current = active[participantIndex]
    let changed = active.length !== stored.length

    if (!current || current.userId === participant.userId) {
      if (connectionActive) {
        const connectionIds = new Set(current?.connectionIds ?? [])
        connectionIds.add(connectionId)
        const next = {
          ...participant,
          fieldId: current?.fieldId,
          connectionIds: [...connectionIds],
          lastSeenAt: now,
        }
        if (participantIndex >= 0) active[participantIndex] = next
        else {
          active.push(next)
          changed = true
        }
      } else if (current) {
        const connectionIds = (current.connectionIds ?? []).filter(
          (id) => id !== connectionId,
        )
        if (connectionIds.length) {
          active[participantIndex] = { ...current, connectionIds }
        } else {
          active.splice(participantIndex, 1)
          changed = true
        }
      }
    }

    if (hasSharedPresence) {
      await config.adapter.savePresence?.(roomId, active)
    } else {
      localPresence.set(roomId, active)
    }

    return changed
  }

  return {
    rawAdapter: config.adapter,
    setPresenceConnection: async (input) =>
      await withLock(input.roomId, async () => await setPresenceConnection(input)),
    sync: async ({ roomId, initialSnapshot, stateVector, update, presence }) =>
      await withLock(roomId, async () => {
        const room = await loadRoom(roomId, initialSnapshot)
        if (update?.length) {
          Y.applyUpdate(room.doc, update)
          await config.adapter.save(roomId, storedState(room))
        }

        const nextPresence = await syncPresence(roomId, presence)

        return {
          update: stateVector
            ? Y.encodeStateAsUpdate(room.doc, stateVector)
            : Y.encodeStateAsUpdate(room.doc),
          savedStateVector: room.savedStateVector,
          presence: nextPresence.presence,
          presenceChanged: nextPresence.changed,
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
    discard: async ({ roomId, initialSnapshot, stateVector }) =>
      await withLock(roomId, async () => {
        const room = await loadRoom(roomId, initialSnapshot)
        replaceContentSnapshot(room.doc, initialSnapshot)
        room.savedStateVector = Y.encodeStateVector(room.doc)
        await config.adapter.save(roomId, storedState(room))
        return {
          update: stateVector
            ? Y.encodeStateAsUpdate(room.doc, stateVector)
            : Y.encodeStateAsUpdate(room.doc),
          savedStateVector: room.savedStateVector,
        }
      }),
    hasUnsavedChanges: async ({ roomId, initialSnapshot }) => {
      const room = await loadRoom(roomId, initialSnapshot)
      return !equalFlat(Y.encodeStateVector(room.doc), room.savedStateVector)
    },
    delete: async (roomId) =>
      await withLock(roomId, async () => {
        rooms.delete(roomId)
        localPresence.delete(roomId)
        await config.adapter.delete?.(roomId)
      }),
  }
}
