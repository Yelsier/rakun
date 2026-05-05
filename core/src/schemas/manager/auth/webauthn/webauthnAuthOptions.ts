import z from 'zod'

export const webauthnAuthOptionsInput = z.object({
  challengeToken: z.string(),
})

export const webauthnAuthOptionsOutput = z.object({
  options: z.any(),
})

export type WebauthnAuthOptionsInput = z.infer<typeof webauthnAuthOptionsInput>
export type WebauthnAuthOptionsOutput = z.infer<
  typeof webauthnAuthOptionsOutput
>
