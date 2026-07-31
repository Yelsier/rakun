import { getPasswordFail2banConfig } from '../../../../auth/passwordFail2ban'
import { LoginIpBlock } from '../../../../internal-content-types'
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
  const result = await db.list(LoginIpBlock, {
    filter: { blockedAt: { $exists: true } } as never,
    options: { limit: 'all', sort: { blockedAt: 'desc' } as never },
  })

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
