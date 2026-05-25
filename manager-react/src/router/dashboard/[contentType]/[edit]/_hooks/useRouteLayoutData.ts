import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'

import type {
  LayoutModuleOption,
  ManagerContentTypeRecord,
  RouteLayoutModuleOverrideRecord,
  RouteLayoutModuleRecord,
} from '../edit.types'

import {
  createManagerQueryOptions,
  useManagerClient,
  useManagerQuery,
} from '@/client/react'
import { useLanguage } from '@/state/language'

export const useRouteLayoutData = ({
  contentTypeName,
  contentTypeId,
}: {
  contentTypeName: string
  contentTypeId?: string
}) => {
  const managerClient = useManagerClient()
  const { getTranslation } = useLanguage()

  const routeLayoutModulesQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RouteLayoutModule',
      query: {
        filter: { routeContentType: contentTypeName },
        options: {
          limit: 'all',
          fields: [
            'routeId',
            'routeKey',
            'routeContentType',
            'key',
            'contentType',
            'order',
            'moduleId',
          ],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  })
  const routeLayoutOverridesQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RouteLayoutModuleOverride',
      query: {
        filter: { contentTypeId: contentTypeId ?? '' },
        options: {
          limit: 'all',
          fields: ['routeId', 'routeKey', 'contentTypeId', 'key', 'contentType', 'moduleId'],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  })
  const contentTypesQuery = useManagerQuery({
    name: 'manager.contentTypes',
    input: undefined as never,
    enabled: Boolean(contentTypeId),
  })

  const routeLayoutModules = useMemo(
    () => (routeLayoutModulesQuery.data?.items ?? []) as RouteLayoutModuleRecord[],
    [routeLayoutModulesQuery.data?.items],
  )
  const routeLayoutOverrides = useMemo(
    () => (routeLayoutOverridesQuery.data?.items ?? []) as RouteLayoutModuleOverrideRecord[],
    [routeLayoutOverridesQuery.data?.items],
  )
  const overridesByKey = useMemo(
    () =>
      new Map(
        routeLayoutOverrides.map((override) => [`${override.routeId}:${override.key}`, override]),
      ),
    [routeLayoutOverrides],
  )
  const contentTypes = useMemo(
    () => (contentTypesQuery.data ?? []) as ManagerContentTypeRecord[],
    [contentTypesQuery.data],
  )
  const contentTypeByName = useMemo(
    () => new Map(contentTypes.map((contentType) => [contentType.name, contentType])),
    [contentTypes],
  )
  const sortedRouteLayoutModules = useMemo(
    () => [...routeLayoutModules].sort((a, b) => a.order - b.order),
    [routeLayoutModules],
  )
  const layoutContentTypes = useMemo(
    () => Array.from(new Set(routeLayoutModules.map((item) => item.contentType))),
    [routeLayoutModules],
  )

  const layoutModuleOptionQueries = useQueries({
    queries: layoutContentTypes.map((contentType) => {
      const labelField = contentTypeByName.get(contentType)?.listFields?.[0] ?? '_id'

      return createManagerQueryOptions(managerClient, 'manager.list', {
        contentType,
        query: {
          options: {
            limit: 'all',
            fields: labelField === '_id' ? ['_id'] : [labelField],
          },
        },
      })
    }),
  })

  const layoutOptionsByContentType = useMemo(
    () =>
      new Map<string, LayoutModuleOption[]>(
        layoutContentTypes.map((contentType, index) => {
          const labelField = contentTypeByName.get(contentType)?.listFields?.[0] ?? '_id'
          const data = layoutModuleOptionQueries[index]?.data as
            | { items?: Array<Record<string, unknown> & { _id: string }> }
            | undefined

          return [
            contentType,
            (data?.items ?? []).map((item) => ({
              value: item._id,
              label: String(getTranslation(item[labelField]) || item._id),
            })),
          ]
        }),
      ),
    [contentTypeByName, getTranslation, layoutContentTypes, layoutModuleOptionQueries],
  )

  return {
    layoutOptionsByContentType,
    overridesByKey,
    routeLayoutOverridesQuery,
    routeLayoutModules: sortedRouteLayoutModules,
  }
}
