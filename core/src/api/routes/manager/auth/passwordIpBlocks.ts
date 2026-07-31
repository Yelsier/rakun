import { getPasswordFail2banConfig } from '../../../../auth/passwordFail2ban'
import { LoginIpBlock } from '../../../../internal-content-types'
import { getEventLogService } from '../../../../eventLog'
import { throwAppError } from '../../../../lib/errors'
import { AUTH_IP_BLOCK_MANAGE_PERMISSION } from '../../../../lib/Permissions'
import { getMongoService } from '../../../../orm'
import type {
  ListPasswordIpBlocksOutput,
  UnblockPasswordIpInput,
  UnblockPasswordIpOutput,
} from '../../../../schemas/manager/auth/passwordIpBlocks'
import type { RakunRequestContext } from '../../../context'
import { recordAuthEvent } from '../../../utils/authEvents'
import { checkPermissions } from '../../../utils/checkPermissions'

const requireManagePermission = (ctx: RakunRequestContext) => {
  const user = ctx.getUser()
  checkPermissions(user, [AUTH_IP_BLOCK_MANAGE_PERMISSION])
  return user
}

export const listPasswordIpBlocksHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext
}): Promise<ListPasswordIpBlocksOutput> => {
  requireManagePermission(ctx)
  const db = await getMongoService()
  const [result, recentFailures] = await Promise.all([
    db.list(LoginIpBlock, {
      filter: { blockedAt: { $exists: true } } as never,
      options: { limit: 'all', sort: { blockedAt: 'desc' } as never },
    }),
    getEventLogService().query({
      types: ['api.operation.failed'],
      operations: ['manager.auth.login'],
      limit: 25,
    }),
  ])

  return {
    maxAttempts: getPasswordFail2banConfig()?.maxAttempts ?? 0,
    items: result.items.flatMap((record) =>
      record.blockedAt
        ? [
            {
              id: record._id,
              ip: record.ip,
              failedAttempts: record.failedAttempts,
              lastFailedAt: record.lastFailedAt.toISOString(),
              blockedAt: record.blockedAt.toISOString(),
            },
          ]
        : [],
    ),
    recentFailures: recentFailures.items.map((event) => {
      const context = event.data?.context
      const passwordLogin =
        context && typeof context === 'object' && !Array.isArray(context)
          ? context.passwordLogin
          : undefined
      const details =
        passwordLogin &&
        typeof passwordLogin === 'object' &&
        !Array.isArray(passwordLogin)
          ? passwordLogin
          : undefined

      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        ip: typeof details?.ip === 'string' ? details.ip : undefined,
        failedAttempts:
          typeof details?.failedAttempts === 'number'
            ? details.failedAttempts
            : 0,
        blocked: details?.blocked === true,
      }
    }),
  }
}

export const unblockPasswordIpHandler = async ({
  input,
  ctx,
}: {
  input: UnblockPasswordIpInput
  ctx: RakunRequestContext
}): Promise<UnblockPasswordIpOutput> => {
  const user = requireManagePermission(ctx)
  const db = await getMongoService()
  const record = await db.find(LoginIpBlock, { _id: input.id })

  if (!record?.blockedAt) {
    throwAppError('NOT_FOUND', {
      resource: LoginIpBlock.name,
      id: input.id,
    })
  }

  await db.delete(LoginIpBlock, { _id: record._id }, { actorId: user._id })
  await recordAuthEvent({
    type: 'auth.password.ip-unblocked',
    outcome: 'success',
    ctx,
    actor: { type: 'ManagerUser', id: String(user._id) },
    resource: { type: LoginIpBlock.name, id: record._id },
    tags: ['password-login', 'ip-block'],
    data: { failedAttempts: record.failedAttempts },
  })

  return { unblocked: true }
}
