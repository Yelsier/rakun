import z from 'zod'

export const webauthnRegisterOptionsInput = z.object({
  deviceName: z.string().min(1, 'Device name is required'),
})

export const webauthnRegisterOptionsOutput = z.object({
  token: z.string(),
  options: z.any(),
})

export type WebauthnRegisterOptionsOutput = z.infer<
  typeof webauthnRegisterOptionsOutput
>

export type WebauthnRegisterOptionsInput = z.infer<
  typeof webauthnRegisterOptionsInput
>
