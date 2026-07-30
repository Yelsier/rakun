import {
  ManagerUser,
  UserMfa,
} from '../../../../../internal-content-types'
import { throwAppError } from '../../../../../lib/errors'
import { getMongoService } from '../../../../../orm'
import type { RegenerateRecoveryCodesInput } from '../../../../../schemas/manager/auth/mfa/recoveryCode'
import type { RakunRequestContext } from '../../../../context'
import { verifyStoredPassword } from '../../../../utils/passwords'
import { generateRecoveryCodes } from '../../../../utils/recoveryCodes'
import { recordAuthEvent } from '../../../../utils/authEvents'

export const regenerateRecoveryCodesHandler = async ({
  input,
  ctx,
}: {
  input: RegenerateRecoveryCodesInput
  ctx: RakunRequestContext
}) => {
  const db = await getMongoService()
  const user = ctx.getUser()
  const storedUser = await db.get(ManagerUser, user._id, ['password'])

  if (!verifyStoredPassword(input.currentPassword, storedUser.password).valid) {
    throwAppError('FORBIDDEN', {
      reason: 'INVALID_CREDENTIALS',
    })
  }

  const mfa = await db.find(UserMfa, { 'user._id': user._id })
  if (!mfa?.enabled) {
    throwAppError('CONFLICT', {
      key: 'MFA_NOT_ENABLED',
      message: 'MFA must be enabled before generating recovery codes',
    })
  }

  const recovery = generateRecoveryCodes()
  await db.update(
    UserMfa,
    mfa._id,
    {
      recoveryCodeHashes: recovery.hashes,
      recoveryCodesGeneratedAt: new Date(),
    },
    { reason: 'mfa recovery codes regenerated' },
  )

  await recordAuthEvent({
    type: 'auth.mfa.recovery-codes.regenerated',
    outcome: 'success',
    ctx,
    actor: { type: 'manager-user', id: String(user._id) },
    resource: { type: 'ManagerUser', id: String(user._id) },
    tags: ['mfa', 'recovery-code'],
    data: { recoveryCodeCount: recovery.codes.length },
  })

  return {
    ok: true as const,
    recoveryCodes: recovery.codes,
  }
}
