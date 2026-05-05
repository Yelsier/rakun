import z from 'zod'

export const webauthnAuthVerifyInput = z.object({
  challengeToken: z.string(),
  response: z.any(),
})

export const webauthnAuthVerifyOutput = z.object({
  token: z.string(),
})

export type WebauthnAuthVerifyInput = z.infer<typeof webauthnAuthVerifyInput>
export type WebauthnAuthVerifyOutput = z.infer<typeof webauthnAuthVerifyOutput>
