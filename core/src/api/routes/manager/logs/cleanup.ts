import { EVENT_LOG_MANAGE_PERMISSION, getEventLogService } from '../../../../eventLog'
import type {
  CleanupEventLogsInput,
  CleanupEventLogsOutput,
} from '../../../../schemas/manager/eventLogs'
import type { RakunRequestContext } from '../../../context'
import { setApiSuccessEventData } from '../../../operations/apiEventLog'
import { checkPermissions } from '../../../utils/checkPermissions'

export const cleanupEventLogsHandler = async ({
  ctx,
  input,
}: {
  ctx: RakunRequestContext
  input: CleanupEventLogsInput
}): Promise<CleanupEventLogsOutput> => {
  checkPermissions(ctx.getUser(), [EVENT_LOG_MANAGE_PERMISSION])

  const before = new Date(input.before)
  const deletedCount = await getEventLogService().deleteBefore(before)

  setApiSuccessEventData(ctx, {
    eventLogCleanup: {
      before: before.toISOString(),
      deletedCount,
    },
  })

  return { deletedCount }
}
