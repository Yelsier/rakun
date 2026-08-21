export type CollaborationRoomState = {
  update: Uint8Array
  savedStateVector: Uint8Array
}

export interface CollaborationAdapter {
  load: (roomId: string) => Promise<CollaborationRoomState | undefined>
  save: (roomId: string, state: CollaborationRoomState) => Promise<void>
  delete?: (roomId: string) => Promise<void>
}

export type CollaborationServiceConfig = {
  adapter: CollaborationAdapter
}
