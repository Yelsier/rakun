import z from 'zod'

import { loginOutput } from './login'

export const loginAdapterIcon = z.enum(['github', 'google', 'microsoft', 'generic'])

export const loginAdapterMetadata = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: loginAdapterIcon,
})

export const externalLoginStartInput = z.object({
  provider: z.string().min(1),
})

export const externalLoginStartOutput = z.object({
  url: z.string().url(),
})

export const externalLoginCompleteInput = z.object({
  provider: z.string().min(1),
  code: z.string().min(1),
  state: z.string().min(1),
})

export const externalLoginCompleteOutput = loginOutput

export type LoginAdapterMetadata = z.infer<typeof loginAdapterMetadata>
export type ExternalLoginStartInput = z.infer<typeof externalLoginStartInput>
export type ExternalLoginStartOutput = z.infer<typeof externalLoginStartOutput>
export type ExternalLoginCompleteInput = z.infer<typeof externalLoginCompleteInput>
export type ExternalLoginCompleteOutput = z.infer<typeof externalLoginCompleteOutput>
