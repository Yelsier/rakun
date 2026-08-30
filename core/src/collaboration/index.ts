import { createMemoryCollaborationAdapter } from './memory'
import { createCollaborationServiceFromAdapter } from './service'
import type { CollaborationService } from './service'
import type { CollaborationServiceConfig } from './types'

let collaborationService: CollaborationService | null = null

export const createCollaborationService = (
  config: CollaborationServiceConfig = {
    adapter: createMemoryCollaborationAdapter(),
  }
) => {
  collaborationService?.dispose()
  collaborationService = createCollaborationServiceFromAdapter(config)
  return collaborationService
}

export const closeCollaborationService = (): void => {
  collaborationService?.dispose()
  collaborationService = null
}

export const getCollaborationService = () => {
  if (!collaborationService) {
    collaborationService = createCollaborationService()
  }
  return collaborationService
}

export { createMemoryCollaborationAdapter, createCollaborationServiceFromAdapter }
export {
  getContentSnapshot,
  initializeContentDocument,
  setContentField,
} from './document'
export {
  getCollaborationRoomReferenceFromTopic,
  getContentCollaborationRoomId,
  getTemplateCollaborationRoomId,
  type CollaborationRoomReference,
} from './rooms'
export type {
  CollaborationAdapter,
  CollaborationPresence,
  CollaborationPresenceState,
  CollaborationRoomState,
  CollaborationServiceConfig,
} from './types'
export type { CollaborationService, CollaborationSyncResult } from './service'
