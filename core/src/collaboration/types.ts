export const COLLABORATION_PRESENCE_TTL_MS = 45_000

export type CollaborationRoomState = {
  update: Uint8Array
  savedStateVector: Uint8Array
}

export type CollaborationPresence = {
  clientId: string
  userId: string
  user: string
  name?: string
  avatar?: {
    url?: string
    previewUrl?: string
  } | null
  fieldId?: string
}

export type CollaborationPresenceState = CollaborationPresence & {
  lastSeenAt: number
  connectionIds?: string[]
}

export interface CollaborationAdapter {
  load: (roomId: string) => Promise<CollaborationRoomState | undefined>
  save: (roomId: string, state: CollaborationRoomState) => Promise<void>
  loadPresence?: (roomId: string) => Promise<CollaborationPresenceState[] | undefined>
  savePresence?: (roomId: string, presence: CollaborationPresenceState[]) => Promise<void>
  delete?: (roomId: string) => Promise<void>
  dispose?: () => void
}

export type CollaborationServiceConfig = {
  adapter: CollaborationAdapter
  /** Release hydrated Yjs documents after inactivity. Adapter state is preserved. Defaults to 5 minutes. */
  roomIdleTimeoutMs?: number
}
