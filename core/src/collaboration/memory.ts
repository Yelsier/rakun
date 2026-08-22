import type { CollaborationAdapter, CollaborationRoomState } from './types'

const cloneState = (state: CollaborationRoomState): CollaborationRoomState => ({
  update: state.update.slice(),
  savedStateVector: state.savedStateVector.slice(),
})

export const createMemoryCollaborationAdapter = (): CollaborationAdapter => {
  const rooms = new Map<string, CollaborationRoomState>()

  return {
    load: async (roomId) => {
      const state = rooms.get(roomId)
      return state ? cloneState(state) : undefined
    },
    save: async (roomId, state) => {
      rooms.set(roomId, cloneState(state))
    },
    delete: async (roomId) => {
      rooms.delete(roomId)
    },
  }
}
