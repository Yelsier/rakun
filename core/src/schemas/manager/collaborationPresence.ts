import z from 'zod'

import { mentionUserAvatar } from './users'

export const collaborationPresenceInput = z.object({
  clientId: z.string().min(1).max(128),
  fieldId: z.string().max(1024).nullable().optional(),
  active: z.boolean().optional().default(true),
})

export const collaborationPresenceOutput = z.object({
  clientId: z.string(),
  userId: z.string(),
  user: z.string(),
  name: z.string().optional(),
  avatar: mentionUserAvatar.optional(),
  fieldId: z.string().optional(),
})

export type CollaborationPresenceInput = z.infer<
  typeof collaborationPresenceInput
>
export type CollaborationPresenceOutput = z.infer<
  typeof collaborationPresenceOutput
>
