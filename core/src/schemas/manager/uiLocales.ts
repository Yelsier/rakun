import { z } from 'zod'

export const ManagerLanguagePackSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  messages: z.record(z.string(), z.string()),
})

export type ManagerLanguagePack = z.infer<typeof ManagerLanguagePackSchema>

export const ManagerUiLocalesOutputSchema = z.object({
  locales: z.array(ManagerLanguagePackSchema),
})

export type ManagerUiLocalesOutput = z.infer<typeof ManagerUiLocalesOutputSchema>
