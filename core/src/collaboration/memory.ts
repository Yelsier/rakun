import {
  COLLABORATION_PRESENCE_TTL_MS,
  type CollaborationAdapter,
  type CollaborationPresenceState,
  type CollaborationRoomState,
} from './types'

const cloneState = (state: CollaborationRoomState): CollaborationRoomState => ({
  update: state.update.slice(),
  savedStateVector: state.savedStateVector.slice(),
})

const clonePresence = (presence: CollaborationPresenceState[]) =>
  presence.map((participant) => ({
    ...participant,
    avatar: participant.avatar ? { ...participant.avatar } : participant.avatar,
    connectionIds: participant.connectionIds?.slice(),
  }))

export const createMemoryCollaborationAdapter = (): CollaborationAdapter => {
  const rooms = new Map<string, CollaborationRoomState>()
  const roomPresence = new Map<string, CollaborationPresenceState[]>()
  let presenceCleanupTimer: ReturnType<typeof setTimeout> | undefined

  const cancelPresenceCleanup = () => {
    if (!presenceCleanupTimer) return
    clearTimeout(presenceCleanupTimer)
    presenceCleanupTimer = undefined
  }

  const schedulePresenceCleanup = () => {
    cancelPresenceCleanup()
    const participants = Array.from(roomPresence.values()).flat()
    if (participants.length === 0) return
    const nextExpiry = Math.min(
      ...participants.map(({ lastSeenAt }) => lastSeenAt + COLLABORATION_PRESENCE_TTL_MS)
    )
    presenceCleanupTimer = setTimeout(
      () => {
        const now = Date.now()
        for (const [roomId, presence] of roomPresence) {
          const active = presence.filter(
            ({ lastSeenAt }) => now - lastSeenAt <= COLLABORATION_PRESENCE_TTL_MS
          )
          if (active.length === 0) roomPresence.delete(roomId)
          else roomPresence.set(roomId, active)
        }
        schedulePresenceCleanup()
      },
      Math.max(1, nextExpiry - Date.now())
    )
    presenceCleanupTimer.unref?.()
  }

  return {
    load: async (roomId) => {
      const state = rooms.get(roomId)
      return state ? cloneState(state) : undefined
    },
    save: async (roomId, state) => {
      rooms.set(roomId, cloneState(state))
    },
    loadPresence: async (roomId) => {
      const presence = roomPresence.get(roomId)
      return presence ? clonePresence(presence) : undefined
    },
    savePresence: async (roomId, presence) => {
      if (presence.length === 0) roomPresence.delete(roomId)
      else roomPresence.set(roomId, clonePresence(presence))
      schedulePresenceCleanup()
    },
    delete: async (roomId) => {
      rooms.delete(roomId)
      roomPresence.delete(roomId)
      schedulePresenceCleanup()
    },
    dispose: () => {
      cancelPresenceCleanup()
      rooms.clear()
      roomPresence.clear()
    },
  }
}
