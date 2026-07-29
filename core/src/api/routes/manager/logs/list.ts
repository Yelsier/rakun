import { EVENT_LOG_READ_PERMISSION, getEventLogService } from '../../../../eventLog'
import type { ListEventLogsInput, ListEventLogsOutput } from '../../../../schemas/manager/eventLogs'
import type { RakunRequestContext } from '../../../context'
import { checkPermissions } from '../../../utils/checkPermissions'

export const listEventLogsHandler = async ({
  ctx,
  input,
}: {
  ctx: RakunRequestContext
  input: ListEventLogsInput
}): Promise<ListEventLogsOutput> => {
  checkPermissions(ctx.getUser(), [EVENT_LOG_READ_PERMISSION])

  const page = await getEventLogService().query({
    ...input,
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(input.to) : undefined,
  })

  return {
    ...page,
    items: page.items.map((event) => ({
      ...event,
      occurredAt: event.occurredAt.toISOString(),
    })),
  }
}
