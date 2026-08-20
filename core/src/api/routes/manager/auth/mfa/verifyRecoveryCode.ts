import {
  ManagerUser,
  MfaChallenge,
  Session,
  UserMfa,
} from '../../../../../internal-content-types'
import { throwAppError } from '../../../../../lib/errors'
import { getMongoService } from '../../../../../orm'
import type { VerifyRecoveryCodeInput } from '../../../../../schemas/manager/auth/mfa/recoveryCode'
import { SESSION_MAX_AGE_MS } from '../../../../sessionCookie'
import {
  assertAuthRateLimit,
  resetAuthRateLimit,
} from '../../../../utils/authRateLimit'
import { findRecoveryCodeHash } from '../../../../utils/recoveryCodes'
import { recordAuthEvent } from '../../../../utils/authEvents'
import type { RakunRequestContext } from '../../../../context'
import { getPlatform } from '../../../../../platform'

export const verifyRecoveryCodeHandler = async ({
  input,
  ctx,
}: {
  input: VerifyRecoveryCodeInput
  ctx?: RakunRequestContext
}) => {
  const db = await getMongoService()
  const rateLimitKey = `mfa:recovery:${input.challenge}`

  assertAuthRateLimit({
    key: rateLimitKey,
    limit: 8,
    windowMs: 5 * 60 * 1000,
  })

  const challenge = await db.find(MfaChallenge, { token: input.challenge })
  if (!challenge) {
    throwAppError('NOT_FOUND', {
      id: input.challenge,
      resource: 'MfaChallenge',
    })
  }

  if (
    challenge.consumedAt ||
    new Date(challenge.expiresAt).getTime() <= Date.now()
  ) {
    throwAppError('CONFLICT', {
      key: 'INVALID_MFA_CHALLENGE',
      message: 'MFA challenge is invalid or expired',
    })
  }

  const attempts = Number(challenge.attempts ?? 0)
  if (attempts >= 8) {
    throwAppError('CONFLICT', {
      key: 'MFA_ATTEMPTS_EXHAUSTED',
      message: 'Too many failed attempts',
    })
  }

  await db.update(MfaChallenge, challenge._id, { attempts: attempts + 1 })

  const userId = challenge.user._id
  const mfa = await db.find(UserMfa, { 'user._id': userId })
  const hashes = (mfa?.recoveryCodeHashes ?? []).filter(
    (hash): hash is string => typeof hash === 'string',
  )
  const usedHash = findRecoveryCodeHash(input.code, hashes)

  if (!mfa?.enabled || !usedHash) {
    return { error: 'INVALID_CODE' as const }
  }

  await db.update(
    UserMfa,
    mfa._id,
    {
      recoveryCodeHashes: hashes.filter((hash) => hash !== usedHash),
    },
    { reason: 'mfa recovery code consumed' },
  )
  await db.update(MfaChallenge, challenge._id, { consumedAt: new Date() })
  resetAuthRateLimit(rateLimitKey)

  const token = getPlatform().crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS)

  await db.create(Session, {
    token,
    user: {
      _id: userId,
      contentType: ManagerUser.name,
      type: 'existing',
    },
    expiresAt,
    _type: 'Session',
  })

  await recordAuthEvent({
    type: 'auth.mfa.recovery-code.used',
    outcome: 'success',
    ctx,
    actor: { type: 'manager-user', id: String(userId) },
    resource: { type: 'ManagerUser', id: String(userId) },
    tags: ['mfa', 'recovery-code'],
    data: { remainingRecoveryCodes: hashes.length - 1 },
  })

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  }
}
