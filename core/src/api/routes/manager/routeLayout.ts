import {
  RouteLayoutModule,
  RouteLayoutModuleOverride,
} from '../../../internal-content-types'
import { throwAppError } from '../../../lib/errors'
import { getMongoService } from '../../../orm'
import type {
  RouteLayoutReferenceInput,
  RouteLayoutStateOutput,
  SetRouteLayoutOverrideInput,
  SetRouteLayoutOverrideOutput,
} from '../../../schemas/manager/routeLayout'
import type { RakunRequestContext } from '../../context'
import { checkOwnership } from '../../utils/checkOwnership'
import { requireContentType } from '../../utils/requireContentType'
import { syncConfiguredRoutes } from '../../utils/routes/syncConfiguredRoutes'

const authorizeTarget = async ({
  input,
  ctx,
  permission,
}: {
  input: RouteLayoutReferenceInput
  ctx: RakunRequestContext
  permission: 'readAny' | 'updateAny'
}) => {
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.contentTypeId,
    permission,
  })
  return contentType
}

const toModuleRecord = (
  item: Record<string, unknown> & { _id: string },
): RouteLayoutStateOutput['modules'][number] => ({
  _id: item._id,
  routeId: String(item.routeId),
  routeKey: String(item.routeKey),
  routeContentType: String(item.routeContentType),
  key: String(item.key),
  contentType: String(item.contentType),
  order: Number(item.order),
  ...(typeof item.moduleId === 'string' ? { moduleId: item.moduleId } : {}),
})

const toOverrideRecord = (
  item: Record<string, unknown> & { _id: string },
): RouteLayoutStateOutput['overrides'][number] => ({
  _id: item._id,
  routeId: String(item.routeId),
  routeKey: String(item.routeKey),
  contentTypeId: String(item.contentTypeId),
  key: String(item.key),
  contentType: String(item.contentType),
  ...(typeof item.moduleId === 'string' ? { moduleId: item.moduleId } : {}),
})

export const getRouteLayoutHandler = async ({
  input,
  ctx,
}: {
  input: RouteLayoutReferenceInput
  ctx: RakunRequestContext
}): Promise<RouteLayoutStateOutput> => {
  await authorizeTarget({ input, ctx, permission: 'readAny' })
  await syncConfiguredRoutes()
  const db = await getMongoService()
  const [moduleResult, overrideResult] = await Promise.all([
    db.list(RouteLayoutModule, {
      filter: { routeContentType: input.contentType },
      options: { limit: 'all', sort: { order: 'asc' } as never },
    }),
    db.list(RouteLayoutModuleOverride, {
      filter: { contentTypeId: input.contentTypeId },
      options: { limit: 'all' },
    }),
  ])
  const modules = moduleResult.items.map(toModuleRecord)
  const moduleKeys = new Set(
    modules.map((module) => `${module.routeId}:${module.key}`),
  )
  const overrides = overrideResult.items
    .map(toOverrideRecord)
    .filter((override) =>
      moduleKeys.has(`${override.routeId}:${override.key}`),
    )
  const optionContentTypes = Array.from(
    new Set(modules.map((module) => module.contentType)),
  )
  const options = await Promise.all(
    optionContentTypes.map(async (contentTypeName) => {
      const contentType = requireContentType(contentTypeName)
      const labelField = contentType.listFields?.[0] ?? '_id'
      const result = await db.list(contentType, {
        options: {
          limit: 'all',
          fields: labelField === '_id' ? ['_id'] : [labelField],
        },
      } as never)
      return {
        contentType: contentTypeName,
        items: result.items.map((item) => ({
          value: item._id,
          label: labelField === '_id' ? item._id : item[labelField],
        })),
      }
    }),
  )

  return { modules, overrides, options }
}

export const setRouteLayoutOverrideHandler = async ({
  input,
  ctx,
}: {
  input: SetRouteLayoutOverrideInput
  ctx: RakunRequestContext
}): Promise<SetRouteLayoutOverrideOutput> => {
  await authorizeTarget({ input, ctx, permission: 'updateAny' })
  await syncConfiguredRoutes()
  const db = await getMongoService()
  const layoutModule = await db.find(RouteLayoutModule, {
    routeId: input.routeId,
    routeContentType: input.contentType,
    key: input.key,
  })
  if (!layoutModule) {
    throwAppError('NOT_FOUND', {
      resource: RouteLayoutModule.name,
      id: `${input.routeId}:${input.key}`,
    })
  }

  const existing = await db.find(RouteLayoutModuleOverride, {
    routeId: input.routeId,
    contentTypeId: input.contentTypeId,
    key: input.key,
  })
  if (input.moduleId === null) {
    if (existing) {
      await db.delete(
        RouteLayoutModuleOverride,
        { _id: existing._id },
        { actorId: ctx.getUser()._id },
      )
    }
    return { override: null }
  }

  if (input.moduleId) {
    const moduleContentType = requireContentType(layoutModule.contentType)
    const selectedModule = await db.find(moduleContentType, {
      _id: input.moduleId,
    })
    if (!selectedModule) {
      throwAppError('NOT_FOUND', {
        resource: moduleContentType.name,
        id: input.moduleId,
      })
    }
  }

  const data = {
    routeId: layoutModule.routeId,
    routeKey: layoutModule.routeKey,
    contentTypeId: input.contentTypeId,
    key: layoutModule.key,
    contentType: layoutModule.contentType,
    moduleId: input.moduleId,
    updatedBy: ctx.getUser()._id,
  }
  const saved = existing
    ? await db.update(RouteLayoutModuleOverride, existing._id, data, {
        actorId: ctx.getUser()._id,
      })
    : await db.create(
        RouteLayoutModuleOverride,
        {
          _type: RouteLayoutModuleOverride.name,
          ...data,
          createdBy: ctx.getUser()._id,
        },
        { actorId: ctx.getUser()._id },
      )

  return { override: toOverrideRecord(saved) }
}
