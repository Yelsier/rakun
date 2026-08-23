'use client'

import { useSyncExternalStore } from 'react'
import type { CollaborationPresenceOutput } from '@rakun-kit/core/client'

export type CollaborationPresenceSnapshot = {
  clientId: string
  participants: CollaborationPresenceOutput[]
}

const EMPTY_SNAPSHOT: CollaborationPresenceSnapshot = {
  clientId: '',
  participants: [],
}
const snapshots = new Map<string, CollaborationPresenceSnapshot>()
const listeners = new Map<string, Set<() => void>>()

export const getCollaborationPresenceRoomKey = (
  resource: 'content' | 'template',
  contentType: string,
  documentId?: string,
) =>
  resource === 'template'
    ? `template:${contentType}`
    : `content:${contentType}:${documentId ?? ''}`

export const setCollaborationPresenceSnapshot = (
  roomKey: string,
  snapshot: CollaborationPresenceSnapshot,
) => {
  snapshots.set(roomKey, snapshot)
  for (const listener of listeners.get(roomKey) ?? []) listener()
}

export const clearCollaborationPresenceSnapshot = (
  roomKey: string,
  clientId: string,
) => {
  if (snapshots.get(roomKey)?.clientId !== clientId) return
  snapshots.delete(roomKey)
  for (const listener of listeners.get(roomKey) ?? []) listener()
}

export const useCollaborationPresenceSnapshot = (roomKey: string) =>
  useSyncExternalStore(
    (listener) => {
      const roomListeners = listeners.get(roomKey) ?? new Set<() => void>()
      roomListeners.add(listener)
      listeners.set(roomKey, roomListeners)
      return () => {
        roomListeners.delete(listener)
        if (!roomListeners.size) listeners.delete(roomKey)
      }
    },
    () => snapshots.get(roomKey) ?? EMPTY_SNAPSHOT,
    () => EMPTY_SNAPSHOT,
  )
