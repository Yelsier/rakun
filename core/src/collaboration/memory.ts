import type {
  CollaborationAdapter,
  CollaborationPresenceState,
  CollaborationRoomState,
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
      roomPresence.set(roomId, clonePresence(presence))
    },
    delete: async (roomId) => {
      rooms.delete(roomId)
      roomPresence.delete(roomId)
    },
  }
}
