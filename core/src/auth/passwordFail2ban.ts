import { isIP } from 'node:net'
import type { Db } from 'mongodb'

import { getRakunBootstrapOptions } from '../bootstrapState'
import { LoginIpBlock } from '../internal-content-types'
import { throwAppError } from '../lib/errors'
import { getMongoService } from '../orm'
import type { RakunRequestContext } from '../api/context'
import { getRequestRateLimitIdentifier } from '../api/utils/authRateLimit'

export const DEFAULT_PASSWORD_FAIL2BAN_MAX_ATTEMPTS = 5

export const normalizePasswordLoginIp = (
  value: string | undefined,
): string | undefined => {
  const candidate = value?.trim()
  if (!candidate || candidate === 'unknown') return undefined

  if (candidate.startsWith('::ffff:')) {
    const ipv4 = candidate.slice('::ffff:'.length)
    if (isIP(ipv4) === 4) return ipv4
  }

  if (isIP(candidate)) return candidate

  return undefined
}

export const getPasswordFail2banConfig = () => {
  const configured = getRakunBootstrapOptions()?.login?.fail2ban
  if (configured === false) return null

  return {
    maxAttempts:
      configured?.maxAttempts ?? DEFAULT_PASSWORD_FAIL2BAN_MAX_ATTEMPTS,
    resolveIp: configured?.resolveIp,
  }
}

export const resolvePasswordLoginIp = (
  ctx?: RakunRequestContext,
): string | undefined => {
  if (!ctx) return undefined
  const config = getPasswordFail2banConfig()
  if (!config) return undefined

  return normalizePasswordLoginIp(
    config.resolveIp?.(ctx) ?? getRequestRateLimitIdentifier(ctx),
  )
}

export const assertPasswordIpAllowed = async (ip?: string) => {
  if (!ip) return
  const db = await getMongoService()
  const record = await db.find(LoginIpBlock, { ip })

  if (record?.blockedAt) {
    throwAppError('FORBIDDEN', { reason: 'IP_BLOCKED' })
  }
}

export const recordPasswordFailure = async (
  ip?: string,
): Promise<{
  blocked: boolean
  newlyBlocked: boolean
  recordId?: string
  failedAttempts?: number
}> => {
  const config = getPasswordFail2banConfig()
  if (!ip || !config) return { blocked: false, newlyBlocked: false }

  const db = await getMongoService()
  const collection = (db.rawDB as Db).collection(LoginIpBlock.name)
  const now = new Date()
  const update = {
    $inc: { failedAttempts: 1 },
    $set: { lastFailedAt: now, updatedAt: now },
    $setOnInsert: {
      _type: LoginIpBlock.name,
      ip,
      createdAt: now,
    },
  }
  let record
  try {
    record = await collection.findOneAndUpdate(
      { ip },
      update,
      { upsert: true, returnDocument: 'after' },
    )
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 11000
    ) {
      throw error
    }

    record = await collection.findOneAndUpdate(
      { ip },
      {
        $inc: update.$inc,
        $set: update.$set,
      },
      { returnDocument: 'after' },
    )
  }
  const failedAttempts = Number(record?.failedAttempts ?? 1)

  if (record?.blockedAt) {
    return {
      blocked: true,
      newlyBlocked: false,
      recordId: String(record._id),
      failedAttempts,
    }
  }

  let newlyBlocked = false
  if (failedAttempts >= config.maxAttempts && record?._id) {
    const blocked = await collection.findOneAndUpdate(
      { _id: record._id, blockedAt: { $exists: false } },
      { $set: { blockedAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    )
    newlyBlocked = Boolean(blocked)
  }

  return {
    blocked: failedAttempts >= config.maxAttempts,
    newlyBlocked,
    recordId: record?._id ? String(record._id) : undefined,
    failedAttempts,
  }
}

export const clearPasswordFailures = async (ip?: string) => {
  if (!ip || !getPasswordFail2banConfig()) return
  const db = await getMongoService()
  await (db.rawDB as Db)
    .collection(LoginIpBlock.name)
    .deleteOne({ ip, blockedAt: { $exists: false } })
}
