import { z } from 'zod'

export const ManagerLanguagePackSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  messages: z.record(z.string(), z.string()),
})

export type ManagerLanguagePack = z.infer<typeof ManagerLanguagePackSchema>

export const extendManagerLanguagePack = (
  languagePack: ManagerLanguagePack,
  extraMessages: Readonly<Record<string, string>>,
): ManagerLanguagePack => ({
  ...languagePack,
  messages: {
    ...languagePack.messages,
    ...extraMessages,
  },
})

export const ManagerUiLocalesOutputSchema = z.object({
  locales: z.array(ManagerLanguagePackSchema),
})

export type ManagerUiLocalesOutput = z.infer<typeof ManagerUiLocalesOutputSchema>
