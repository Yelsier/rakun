import { createHash, randomBytes } from 'crypto'

import {
  ManagerUser,
  PasswordResetToken,
  Session,
} from '../../../../internal-content-types'
import { getRakunBootstrapOptions } from '../../../../bootstrapState'
import { Logger } from '../../../../lib/Logger'
import { throwAppError } from '../../../../lib/errors'
import { getMailService, hasMailService } from '../../../../mail'
import { getMongoService } from '../../../../orm'
import type {
  RequestPasswordResetInput,
  ResetPasswordInput,
} from '../../../../schemas/manager/auth/passwordRecovery'
import type { RakunRequestContext } from '../../../context'
import {
  assertAuthRateLimit,
  getRequestRateLimitIdentifier,
} from '../../../utils/authRateLimit'
import { PASSWORD_RESET_DEFAULT_EXPIRES_IN_MS } from '../../../../auth/accountRecovery'
import { recordAuthEvent } from '../../../utils/authEvents'

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

const requirePasswordResetConfig = () => {
  const config = getRakunBootstrapOptions()?.accountRecovery?.passwordReset

  if (!config || !hasMailService()) {
    throwAppError('FEATURE_UNSUPPORTED', {
      feature: 'accountRecovery',
      message:
        'Account recovery requires mail and accountRecovery.passwordReset configuration',
    })
  }

  return config
}

export const requestPasswordResetHandler = async ({
  input,
  ctx,
}: {
  input: RequestPasswordResetInput
  ctx?: RakunRequestContext
}) => {
  const config = requirePasswordResetConfig()
  const db = await getMongoService()
  const email = input.email.trim().toLowerCase()

  assertAuthRateLimit({
    key: `password-reset:request:${getRequestRateLimitIdentifier(ctx)}:${email}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })

  const user = await db.find(ManagerUser, { email })
  if (!user) return { ok: true as const }

  await db.updateMany(
    PasswordResetToken,
    {
      'user._id': user._id,
      consumedAt: null,
    } as never,
    { consumedAt: new Date() },
    { reason: 'password reset token superseded' },
  )

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(
    Date.now() +
      (config.expiresInMs ?? PASSWORD_RESET_DEFAULT_EXPIRES_IN_MS),
  )

  await db.create(
    PasswordResetToken,
    {
      tokenHash: hashToken(token),
      user: {
        _id: user._id,
        contentType: ManagerUser.name,
        type: 'existing',
      },
      expiresAt,
      _type: 'PasswordResetToken',
    },
    { reason: 'password reset requested' },
  )

  await recordAuthEvent({
    type: 'auth.password-reset.requested',
    outcome: 'success',
    ctx,
    actor: { type: 'anonymous' },
    resource: { type: 'ManagerUser', id: String(user._id) },
    tags: ['password-reset'],
    data: { expiresAt: expiresAt.toISOString() },
  })

  try {
    const props = {
      expiresAt,
      resetUrl: config.createUrl(token),
      user: {
        email: user.email,
        ...(user.name ? { name: user.name } : {}),
      },
    }
    const subject =
      typeof config.template.subject === 'function'
        ? await config.template.subject(props)
        : config.template.subject
    const content = await config.template.render(props)

    await getMailService().send({
      to: user.email,
      subject,
      ...content,
      event: {
        template: 'password-reset',
        source: '@rakun-kit/core/account-recovery',
        tags: ['auth', 'account-recovery'],
      },
    })
  } catch (error) {
    Logger?.error?.('Password reset mail could not be sent', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })
  }

  return { ok: true as const }
}

export const resetPasswordHandler = async ({
  input,
  ctx,
}: {
  input: ResetPasswordInput
  ctx?: RakunRequestContext
}) => {
  requirePasswordResetConfig()
  const db = await getMongoService()
  const tokenHash = hashToken(input.token)

  assertAuthRateLimit({
    key: `password-reset:consume:${getRequestRateLimitIdentifier(ctx)}:${tokenHash}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  })

  const record = await db.find(PasswordResetToken, { tokenHash })
  if (
    !record ||
    record.consumedAt ||
    new Date(record.expiresAt).getTime() <= Date.now()
  ) {
    throwAppError('CONFLICT', {
      key: 'INVALID_PASSWORD_RESET_TOKEN',
      message: 'Password reset token is invalid or expired',
    })
  }

  const claimed = await db.updateMany(
    PasswordResetToken,
    {
      tokenHash,
      consumedAt: null,
    } as never,
    { consumedAt: new Date() },
    { reason: 'password reset token consumed' },
  )

  if (claimed.updatedCount !== 1) {
    throwAppError('CONFLICT', {
      key: 'INVALID_PASSWORD_RESET_TOKEN',
      message: 'Password reset token is invalid or expired',
    })
  }

  const userId = record.user._id
  await db.update(
    ManagerUser,
    userId,
    { password: input.password },
    { reason: 'password reset' },
  )
  await db.delete(
    Session,
    { 'user._id': userId },
    { reason: 'password reset invalidated sessions' },
  )
  await db.updateMany(
    PasswordResetToken,
    {
      'user._id': userId,
      consumedAt: null,
    } as never,
    { consumedAt: new Date() },
    { reason: 'password reset completed' },
  )

  await recordAuthEvent({
    type: 'auth.password-reset.completed',
    outcome: 'success',
    ctx,
    actor: { type: 'anonymous' },
    resource: { type: 'ManagerUser', id: String(userId) },
    tags: ['password-reset'],
    data: {
      sessionsInvalidated: true,
      mfaPreserved: true,
    },
  })

  return { ok: true as const }
}
