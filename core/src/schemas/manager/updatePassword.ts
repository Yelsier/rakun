import z from 'zod'

export const updatePasswordInput = z.object({
  currentPassword: z.string().nonempty('Current password is required'),
  newPassword: z.string().nonempty('New password is required'),
})

export type UpdatePasswordInput = z.infer<typeof updatePasswordInput>
