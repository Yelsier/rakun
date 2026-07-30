import type { MailTemplate } from '../mail'

export type PasswordResetMailProps = {
  expiresAt: Date
  resetUrl: string
  user: {
    email: string
    name?: string
  }
}

export type AccountRecoveryConfig = {
  passwordReset: {
    createUrl: (token: string) => string
    expiresInMs?: number
    template: MailTemplate<PasswordResetMailProps>
  }
}

export const PASSWORD_RESET_DEFAULT_EXPIRES_IN_MS = 60 * 60 * 1000
