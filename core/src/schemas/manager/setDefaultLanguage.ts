import z from 'zod'

export const setDefaultLanguageInput = z.object({
  language: z.string(),
})

export type SetDefaultLanguageInput = z.infer<typeof setDefaultLanguageInput>
