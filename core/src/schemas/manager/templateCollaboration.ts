import z from 'zod'

import {
  collaborationPresenceInput,
  collaborationPresenceOutput,
} from './collaborationPresence'
import { templateStateOutput } from './template'

const MAX_ENCODED_UPDATE_LENGTH = 8 * 1024 * 1024
const encodedBinary = z.string().max(MAX_ENCODED_UPDATE_LENGTH)

export const templateCollaborationReferenceInput = z.object({
  contentType: z.string(),
})

export const syncTemplateCollaborationInput =
  templateCollaborationReferenceInput.extend({
    stateVector: encodedBinary.optional(),
    update: encodedBinary.optional(),
    presence: collaborationPresenceInput.optional(),
  })

export const syncTemplateCollaborationOutput = z.object({
  update: encodedBinary,
  savedStateVector: encodedBinary,
  presence: z.array(collaborationPresenceOutput),
})

export const saveTemplateCollaborationOutput = z.object({
  template: templateStateOutput,
  savedStateVector: encodedBinary,
})

export type TemplateCollaborationReferenceInput = z.infer<
  typeof templateCollaborationReferenceInput
>
export type SyncTemplateCollaborationInput = z.infer<
  typeof syncTemplateCollaborationInput
>
export type SyncTemplateCollaborationOutput = z.infer<
  typeof syncTemplateCollaborationOutput
>
export type SaveTemplateCollaborationOutput = z.infer<
  typeof saveTemplateCollaborationOutput
>
