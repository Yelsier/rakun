import { useMemo } from 'react'

import type {
  LayoutModuleOption,
  RouteLayoutModuleOverrideRecord,
  RouteLayoutModuleRecord,
} from '../edit.types'

import { useManagerQuery } from '@/client/react'
import { useLanguage } from '@/state/language'

export const useRouteLayoutData = ({
  contentTypeName,
  contentTypeId,
}: {
  contentTypeName: string
  contentTypeId?: string
}) => {
  const { getTranslation } = useLanguage()
  const routeLayoutQuery = useManagerQuery({
    name: 'manager.routeLayout.get',
    input: {
      contentType: contentTypeName,
      contentTypeId: contentTypeId ?? '',
    },
    enabled: Boolean(contentTypeId),
  })
  const routeLayoutModules = useMemo(
    () =>
      [...(routeLayoutQuery.data?.modules ?? [])].sort(
        (left, right) => left.order - right.order,
      ) as RouteLayoutModuleRecord[],
    [routeLayoutQuery.data?.modules],
  )
  const routeLayoutOverrides = useMemo(
    () =>
      (routeLayoutQuery.data?.overrides ??
        []) as RouteLayoutModuleOverrideRecord[],
    [routeLayoutQuery.data?.overrides],
  )
  const overridesByKey = useMemo(
    () =>
      new Map(
        routeLayoutOverrides.map((override) => [
          `${override.routeId}:${override.key}`,
          override,
        ]),
      ),
    [routeLayoutOverrides],
  )
  const layoutOptionsByContentType = useMemo(
    () =>
      new Map<string, LayoutModuleOption[]>(
        (routeLayoutQuery.data?.options ?? []).map((optionGroup) => [
          optionGroup.contentType,
          optionGroup.items.map((item) => ({
            value: item.value,
            label: String(getTranslation(item.label) || item.value),
          })),
        ]),
      ),
    [getTranslation, routeLayoutQuery.data?.options],
  )

  return {
    layoutOptionsByContentType,
    overridesByKey,
    routeLayoutOverridesQuery: routeLayoutQuery,
    routeLayoutModules,
  }
}
