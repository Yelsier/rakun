import { z } from 'zod'

import { loginAdapterMetadata } from './auth/externalLogin'

export const ManagerLanguagePackSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  messages: z.record(z.string(), z.string()),
})

export type ManagerLanguagePack = z.infer<typeof ManagerLanguagePackSchema>

export const extendManagerLanguagePack = (
  languagePack: ManagerLanguagePack,
  extraMessages: Readonly<Record<string, string>>
): ManagerLanguagePack => ({
  ...languagePack,
  messages: {
    ...languagePack.messages,
    ...extraMessages,
  },
})

export const ManagerUiLocalesOutputSchema = z.object({
  locales: z.array(ManagerLanguagePackSchema),
  homePageGroupId: z.string().optional(),
  siteUrl: z.string().optional(),
  platform: z.object({
    realtime: z.discriminatedUnion('transport', [
      z.object({
        transport: z.literal('polling'),
        intervalMs: z.number().int().positive(),
      }),
      z.object({
        transport: z.literal('sse'),
        endpoint: z.string().min(1),
      }),
    ]),
  }),
  features: z.object({
    passwordRecovery: z.boolean(),
    login: z.object({
      password: z.boolean(),
      adapters: z.array(loginAdapterMetadata),
    }),
  }),
})

export type ManagerUiLocalesOutput = z.infer<typeof ManagerUiLocalesOutputSchema>
