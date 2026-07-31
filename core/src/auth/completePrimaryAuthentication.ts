import { randomBytes } from 'crypto'

import { ManagerUser, MfaChallenge, Session, UserMfa } from '../internal-content-types'
import { getMongoService } from '../orm'
import type { LoginOutput } from '../schemas/manager/auth/login'
import { SESSION_MAX_AGE_MS } from '../api/sessionCookie'

export const completePrimaryAuthentication = async (userId: string): Promise<LoginOutput> => {
  const db = await getMongoService()
  const mfa = await db.find(UserMfa, { 'user._id': userId })

  if (mfa?.enabled) {
    const challenge = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5)

    await db.create(MfaChallenge, {
      token: challenge,
      user: {
        _id: userId,
        contentType: ManagerUser.name,
        type: 'existing',
      },
      method: mfa.preferredMethod ?? 'totp',
      expiresAt,
      attempts: 0,
      _type: 'MfaChallenge',
    })

    return {
      challenge,
      method: mfa.preferredMethod ?? 'totp',
      expiresAt: expiresAt.toISOString(),
    }
  }

  const token = crypto.randomUUID()
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

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  }
}
