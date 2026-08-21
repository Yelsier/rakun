import { createMemoryCollaborationAdapter } from './memory'
import { createCollaborationServiceFromAdapter } from './service'
import type { CollaborationService } from './service'
import type { CollaborationServiceConfig } from './types'

let collaborationService: CollaborationService | null = null

export const createCollaborationService = (
  config: CollaborationServiceConfig = {
    adapter: createMemoryCollaborationAdapter(),
  },
) => {
  collaborationService = createCollaborationServiceFromAdapter(config)
  return collaborationService
}

export const getCollaborationService = () => {
  if (!collaborationService) {
    collaborationService = createCollaborationService()
  }
  return collaborationService
}

export { createMemoryCollaborationAdapter, createCollaborationServiceFromAdapter }
export { getContentSnapshot, initializeContentDocument, setContentField } from './document'
export type {
  CollaborationAdapter,
  CollaborationRoomState,
  CollaborationServiceConfig,
} from './types'
export type { CollaborationService, CollaborationSyncResult } from './service'
