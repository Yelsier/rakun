import z from 'zod'

import {
  collaborationPresenceInput,
  collaborationPresenceOutput,
} from './collaborationPresence'

const MAX_ENCODED_UPDATE_LENGTH = 8 * 1024 * 1024
const encodedBinary = z.string().max(MAX_ENCODED_UPDATE_LENGTH)

export const contentCollaborationReferenceInput = z.object({
  contentType: z.string(),
  documentId: z.string(),
})

export const syncContentCollaborationInput = contentCollaborationReferenceInput.extend({
  stateVector: encodedBinary.optional(),
  update: encodedBinary.optional(),
  presence: collaborationPresenceInput.optional(),
})

export const syncContentCollaborationOutput = z.object({
  update: encodedBinary,
  savedStateVector: encodedBinary,
  presence: z.array(collaborationPresenceOutput),
})

export const saveContentCollaborationOutput = z.object({
  document: z.any(),
  savedStateVector: encodedBinary,
})

export type ContentCollaborationReferenceInput = z.infer<
  typeof contentCollaborationReferenceInput
>
export type SyncContentCollaborationInput = z.infer<typeof syncContentCollaborationInput>
export type SyncContentCollaborationOutput = z.infer<typeof syncContentCollaborationOutput>
export type SaveContentCollaborationOutput = z.infer<typeof saveContentCollaborationOutput>
