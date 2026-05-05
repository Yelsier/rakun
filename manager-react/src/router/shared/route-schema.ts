import type { EncodedContentType } from '@rakun-kit/core/client'
import type { ReactNode } from 'react'

import type {
  ManagerResolvedRoute,
  ManagerResolvedRouteKind,
  ManagerRouteRendererProps,
  ManagerSearchParams,
} from './types'

export type ManagerRouteLayout = 'auth' | 'dashboard'

export type ManagerRouteContext = {
  params: Record<string, string>
  searchParams?: ManagerSearchParams
}

export type ManagerRouteDefinition<K extends ManagerResolvedRouteKind> = {
  kind: K
  path: string
  layout: ManagerRouteLayout
  parse: (
    context: ManagerRouteContext,
  ) => Extract<ManagerResolvedRoute, { kind: K }>
  render: (
    route: Extract<ManagerResolvedRoute, { kind: K }>,
    props: ManagerRouteRendererProps,
    contentType?: EncodedContentType,
  ) => ReactNode
}

export type AnyManagerRouteDefinition = {
  [K in ManagerResolvedRouteKind]: ManagerRouteDefinition<K>
}[ManagerResolvedRouteKind]

export const defineManagerRoute = <K extends ManagerResolvedRouteKind>(
  definition: ManagerRouteDefinition<K>,
) => definition

export const getSearchParam = (searchParams: ManagerSearchParams, key: string) => {
  if (!searchParams) return undefined

  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined
  }

  const value = searchParams[key]
  return Array.isArray(value) ? value[0] : value
}

const splitPath = (value: string) =>
  value
    .replace(/\/+$/, '')
    .replace(/^\/?/, '/')
    .split('/')
    .filter(Boolean)

export const matchRoutePath = (routePath: string, pathname: string) => {
  const routeParts = splitPath(routePath)
  const pathParts = splitPath(pathname)

  if (routeParts.length !== pathParts.length) return undefined

  const params: Record<string, string> = {}

  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index] ?? ''
    const pathPart = pathParts[index] ?? ''

    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart)
      continue
    }

    if (routePart !== pathPart) {
      return undefined
    }
  }

  return params
}
