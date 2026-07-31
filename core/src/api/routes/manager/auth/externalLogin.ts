import { createHash, randomBytes, timingSafeEqual } from 'crypto'

import { completePrimaryAuthentication } from '../../../../auth/completePrimaryAuthentication'
import type { LoginAdapter } from '../../../../auth/loginAdapters'
import { getRakunBootstrapOptions } from '../../../../bootstrapState'
import { ManagerUser } from '../../../../internal-content-types'
import { throwAppError } from '../../../../lib/errors'
import { getMongoService } from '../../../../orm'
import type {
  ExternalLoginCompleteInput,
  ExternalLoginCompleteOutput,
  ExternalLoginStartInput,
  ExternalLoginStartOutput,
} from '../../../../schemas/manager/auth/externalLogin'
import type { RakunRequestContext } from '../../../context'
import { recordAuthEvent } from '../../../utils/authEvents'
import {
  assertAuthRateLimit,
  getRequestRateLimitIdentifier,
  resetAuthRateLimit,
} from '../../../utils/authRateLimit'

const LOGIN_FLOW_COOKIE = 'rakun_login_flow'
const LOGIN_FLOW_MAX_AGE_MS = 10 * 60 * 1000

type LoginFlow = {
  provider: string
  state: string
  codeVerifier: string
  expiresAt: number
}

const getAdapter = (provider: string): LoginAdapter => {
  const adapter = getRakunBootstrapOptions()?.login?.adapters?.find(
    (candidate) => candidate.id === provider
  )

  if (!adapter) throwAppError('FORBIDDEN', { reason: 'LOGIN_PROVIDER_NOT_FOUND' })
  return adapter
}

const setFlowCookie = (ctx: RakunRequestContext | undefined, flow: LoginFlow | null) => {
  const value = flow ? Buffer.from(JSON.stringify(flow)).toString('base64url') : ''
  const maxAge = flow ? LOGIN_FLOW_MAX_AGE_MS : 0

  if (ctx?.res?.cookie) {
    ctx.res.cookie(LOGIN_FLOW_COOKIE, value, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
      secure: true,
    })
    return
  }

  ctx?.res?.setHeader(
    'Set-Cookie',
    `${LOGIN_FLOW_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor(maxAge / 1000)}`
  )
}

const getFlowCookie = (ctx?: RakunRequestContext): LoginFlow | null => {
  const value = ctx?.req?.cookies?.[LOGIN_FLOW_COOKIE]
  if (!value) return null

  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8')
    ) as Partial<LoginFlow>

    if (
      typeof parsed.provider !== 'string' ||
      typeof parsed.state !== 'string' ||
      typeof parsed.codeVerifier !== 'string' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }

    return parsed as LoginFlow
  } catch {
    return null
  }
}

const statesMatch = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export const externalLoginStartHandler = async ({
  input,
  ctx,
}: {
  input: ExternalLoginStartInput
  ctx?: RakunRequestContext
}): Promise<ExternalLoginStartOutput> => {
  const adapter = getAdapter(input.provider)
  const state = `${adapter.id}.${randomBytes(32).toString('base64url')}`
  const codeVerifier = randomBytes(48).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')

  setFlowCookie(ctx, {
    provider: adapter.id,
    state,
    codeVerifier,
    expiresAt: Date.now() + LOGIN_FLOW_MAX_AGE_MS,
  })

  return {
    url: await adapter.createAuthorizationUrl({ state, codeChallenge }),
  }
}

export const externalLoginCompleteHandler = async ({
  input,
  ctx,
}: {
  input: ExternalLoginCompleteInput
  ctx?: RakunRequestContext
}): Promise<ExternalLoginCompleteOutput> => {
  const rateLimitKey = `external-login:${getRequestRateLimitIdentifier(ctx)}:${input.provider}`
  assertAuthRateLimit({
    key: rateLimitKey,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  })

  const flow = getFlowCookie(ctx)
  setFlowCookie(ctx, null)
  if (
    !flow ||
    flow.expiresAt <= Date.now() ||
    flow.provider !== input.provider ||
    !statesMatch(flow.state, input.state)
  ) {
    throwAppError('FORBIDDEN', { reason: 'INVALID_LOGIN_FLOW' })
  }

  const adapter = getAdapter(input.provider)
  let identity
  try {
    identity = await adapter.authenticate({
      code: input.code,
      codeVerifier: flow.codeVerifier,
    })
  } catch {
    throwAppError('FORBIDDEN', { reason: 'INVALID_CREDENTIALS' })
  }

  if (!identity.emailVerified) {
    throwAppError('FORBIDDEN', { reason: 'INVALID_CREDENTIALS' })
  }

  const db = await getMongoService()
  const user = await db.find(ManagerUser, {
    email: identity.email.trim().toLowerCase(),
  })
  if (!user) throwAppError('FORBIDDEN', { reason: 'INVALID_CREDENTIALS' })

  resetAuthRateLimit(rateLimitKey)
  const result = await completePrimaryAuthentication(user._id)
  await recordAuthEvent({
    type: 'auth.external-login.succeeded',
    outcome: 'success',
    ctx,
    actor: { type: 'ManagerUser', id: String(user._id) },
    resource: { type: 'ManagerUser', id: String(user._id) },
    tags: ['external-login', adapter.id],
    data: {
      provider: adapter.id,
      mfaRequired: 'challenge' in result,
    },
  })

  return result
}
