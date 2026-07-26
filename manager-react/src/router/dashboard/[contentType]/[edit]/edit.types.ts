import type { EncodedContentType } from '@rakun-kit/core/client'

import type { FieldValue } from './_fields/shared'

import type { ManagerPreviewConfig } from '@/router/shared/types'

export type RouteLayoutModuleRecord = {
  _id: string
  routeId: string
  routeKey: string
  routeContentType: string
  key: string
  contentType: string
  order: number
  moduleId?: string
}

export type RouteLayoutModuleOverrideRecord = {
  _id: string
  routeId: string
  routeKey: string
  contentTypeId: string
  key: string
  contentType: string
  moduleId?: string
}

export type ManagerContentTypeRecord = {
  name: string
  listFields?: string[]
}

export type LayoutModuleOption = {
  value: string
  label: string
}

export type DocumentVisibility = 'draft' | 'hidden' | 'published' | 'trash'
export type EditableDocumentVisibility = Exclude<DocumentVisibility, 'trash'>

export type ContentTypeRouteMeta = {
  key: string
  hasPage: boolean
}

export type EditPageTab =
  | 'content'
  | 'info'
  | 'seo'
  | 'versions'
  | 'history'
  | `layout:${string}`

export type EditPageProps = {
  contentType: EncodedContentType
  defaultData?: Record<string, FieldValue>
  preview?: ManagerPreviewConfig
  onAfterRestore?: () => Promise<unknown> | unknown
}
