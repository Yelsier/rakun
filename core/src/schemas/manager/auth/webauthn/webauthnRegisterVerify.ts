import z from 'zod'

export const webauthnRegisterVerifyInput = z.object({
  token: z.string(),
  deviceName: z.string(),
  response: z.any(),
})

export type WebauthnRegisterVerifyInput = z.infer<
  typeof webauthnRegisterVerifyInput
>
