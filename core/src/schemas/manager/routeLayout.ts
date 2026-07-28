import z from 'zod'

export const routeLayoutReferenceInput = z.object({
  contentType: z.string().min(1),
  contentTypeId: z.string().min(1),
})

export const routeLayoutModuleRecord = z.object({
  _id: z.string(),
  routeId: z.string(),
  routeKey: z.string(),
  routeContentType: z.string(),
  key: z.string(),
  contentType: z.string(),
  order: z.number(),
  moduleId: z.string().optional(),
})

export const routeLayoutOverrideRecord = z.object({
  _id: z.string(),
  routeId: z.string(),
  routeKey: z.string(),
  contentTypeId: z.string(),
  key: z.string(),
  contentType: z.string(),
  moduleId: z.string().optional(),
})

export const routeLayoutStateOutput = z.object({
  modules: z.array(routeLayoutModuleRecord),
  overrides: z.array(routeLayoutOverrideRecord),
  options: z.array(
    z.object({
      contentType: z.string(),
      items: z.array(
        z.object({
          value: z.string(),
          label: z.unknown(),
        }),
      ),
    }),
  ),
})

export const setRouteLayoutOverrideInput = routeLayoutReferenceInput.extend({
  routeId: z.string().min(1),
  key: z.string().min(1),
  moduleId: z.string().nullable(),
})

export const setRouteLayoutOverrideOutput = z.object({
  override: routeLayoutOverrideRecord.nullable(),
})

export type RouteLayoutReferenceInput = z.infer<
  typeof routeLayoutReferenceInput
>
export type RouteLayoutStateOutput = z.infer<typeof routeLayoutStateOutput>
export type SetRouteLayoutOverrideInput = z.infer<
  typeof setRouteLayoutOverrideInput
>
export type SetRouteLayoutOverrideOutput = z.infer<
  typeof setRouteLayoutOverrideOutput
>
