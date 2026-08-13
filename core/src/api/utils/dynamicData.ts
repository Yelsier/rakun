import { getRakunBootstrapOptions } from '../../bootstrapState'
import type ContentType from '../../lib/ContentType'
import {
  DYNAMIC_BINDINGS_FIELD_NAME,
  DynamicQueryCurrentValueSchema,
  DynamicQueryDocumentValueSchema,
  getDynamicDocumentBindings,
  isDynamicDataSourceContentTypeAllowed,
  type DynamicBindingSource,
  type DynamicListBinding,
  type DynamicListMapSource,
  type DynamicNestedListSource,
  type DynamicRelatedCollectionSource,
} from '../../lib/dynamicData'
import { Logger } from '../../lib/Logger'
import type { DataPopulatedWithoutApiOnly, DBOutput, Query } from '../../lib/types'
import { getContentTypeByName } from '../../lib/Registry'
import type { DBService } from '../../orm/dbService'
import { runOnGetHook } from '../hooks/runContentHooks'
import { getLink } from './getLink'
import { populateFields } from './populates/populateLinks'
import { populateRelations } from './populates/populateRelations'
import { parseSafeManagerQuery } from './safeManagerQuery'
import { getContentHookContext } from '../hooks/context'
import { resolveBreadcrumsFields } from './breadcrums'

type ResolveOptions = {
  db: DBService
  contentType?: ContentType
  contextSource?: {
    contentType: ContentType
    value: Record<string, unknown>
  }
  surface: 'web' | 'preview'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)

const getAtPath = (value: unknown, path: string | undefined) => {
  if (!path) return undefined

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined
    return current[segment]
  }, value)
}

const setAtPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const segments = path.split('.')
  let current = target

  for (const [index, segment] of segments.entries()) {
    if (index === segments.length - 1) {
      Object.defineProperty(current, segment, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
      })
      return
    }

    const existing = current[segment]
    const next = isRecord(existing) ? existing : {}
    if (next !== existing) {
      Object.defineProperty(current, segment, {
        configurable: true,
        enumerable: true,
        value: next,
        writable: true,
      })
    }
    current = next
  }
}

const isPublicDocument = (value: Record<string, unknown>) =>
  value._trashed !== true && value._visibility !== 'draft' && value._visibility !== 'trash'

const getAllowedSourceContentType = (sourceContentTypeName: string) => {
  const contentType = getContentTypeByName(sourceContentTypeName)

  return isDynamicDataSourceContentTypeAllowed(contentType) ? contentType : undefined
}

const getDynamicTargetField = (
  contentType: ContentType,
  path: string
): ContentType['fields'][string] | undefined => {
  const [fieldName, ...rest] = path.split('.')
  const field = contentType.fields[fieldName]
  if (!field || !contentType.allowsDynamicBindingForField(fieldName)) {
    return undefined
  }

  if (rest.length === 0) return field

  return rest.length === 1 &&
    field.meta.capabilities.dynamic?.mapProperties === true &&
    field.meta.capabilities.dynamic?.properties?.[rest[0]]
    ? field
    : undefined
}

const isDynamicSourcePathAllowed = (
  contentType: ContentType,
  path: string | undefined,
  depth = 0
): boolean => {
  if (!path) return false

  const [fieldName, ...rest] = path.split('.')
  const field = contentType.fields[fieldName]
  if (!field || !contentType.allowsDynamicBindingForField(fieldName)) {
    return false
  }

  if (rest.length === 0) return true

  if (field.meta.capabilities.dynamic?.relation === true && 'contentType' in field && depth < 3) {
    return isDynamicSourcePathAllowed(field.contentType as ContentType, rest.join('.'), depth + 1)
  }

  return rest.length === 1 && !!field.meta.capabilities.dynamic?.properties?.[rest[0]]
}

const getDynamicSourceField = (
  contentType: ContentType,
  path: string | undefined,
  depth = 0
): ContentType['fields'][string] | undefined => {
  if (!path) return undefined

  const [fieldName, ...rest] = path.split('.')
  const field = contentType.fields[fieldName]
  if (!field || !contentType.allowsDynamicBindingForField(fieldName)) {
    return undefined
  }

  if (rest.length === 0) return field

  if (field.meta.capabilities.dynamic?.relation === true && 'contentType' in field && depth < 3) {
    return getDynamicSourceField(field.contentType as ContentType, rest.join('.'), depth + 1)
  }

  return undefined
}

const isArraySourceField = (field: ContentType['fields'][string] | undefined) => {
  if (!field) return false
  return field.meta.capabilities.valueKind === 'array'
}

const getRelationTarget = (
  field: ContentType['fields'][string] | undefined
): ContentType | undefined => {
  if (!field || field.getIsTranslatable()) return undefined

  if (field.meta.capabilities.dynamic?.relation === true && 'contentType' in field) {
    return field.contentType as ContentType
  }

  if (field.meta.capabilities.dynamic?.collection === 'homogeneous' && 'field' in field) {
    const itemField = field.field as ContentType['fields'][string]
    if (itemField.meta.capabilities.dynamic?.relation === true && 'contentType' in itemField) {
      return itemField.contentType as ContentType
    }
  }

  return undefined
}

const getDocumentListItemContentType = (
  field: ContentType['fields'][string] | undefined,
  itemName?: string
): ContentType | undefined => {
  if (!field || !isArraySourceField(field) || field.getIsTranslatable()) {
    return undefined
  }

  if (
    field.meta.capabilities.dynamic?.collection === 'heterogeneous' &&
    'fields' in field &&
    Array.isArray(field.fields)
  ) {
    if (!itemName) return undefined

    const entry = field.fields.find((item) => item.name === itemName)
    return entry ? getRelationTarget(entry.field) : undefined
  }

  return getRelationTarget(field)
}

const getRouteKeyForSource = (contentTypeName: string, routeKey?: string): string | undefined => {
  if (routeKey) return routeKey

  return getRakunBootstrapOptions()?.routes?.find(
    (route) => route.contentType === contentTypeName && route.hasPage
  )?.key
}

const resolveHref = async (source: DynamicBindingSource, sourceId: string): Promise<unknown> => {
  const routeKey = getRouteKeyForSource(source.contentType, source.routeKey)
  if (!routeKey) return undefined

  return await getLink(routeKey, sourceId)
}

const loadSourceDocument = async (
  db: DBService,
  source: DynamicBindingSource
): Promise<Record<string, unknown> | undefined> => {
  if (!source.id) return undefined

  const contentType = getContentTypeByName(source.contentType)
  if (!contentType) return undefined

  const item = await db.get(contentType, source.id).catch(() => undefined)
  if (!item || !isPublicDocument(item as Record<string, unknown>)) {
    return undefined
  }

  return (await populateRelations(await populateFields(item as DBOutput<ContentType>))) as Record<
    string,
    unknown
  >
}

const resolveSourceValue = async ({
  db,
  source,
  currentSource,
  currentContentType,
  allowCurrentSource,
  contextSource,
}: {
  db: DBService
  source: DynamicBindingSource
  currentSource?: Record<string, unknown>
  currentContentType?: ContentType
  allowCurrentSource?: boolean
  contextSource?: ResolveOptions['contextSource']
}) => {
  const usesCurrentRecord =
    allowCurrentSource === true &&
    !source.id &&
    !!currentSource &&
    source.contentType === currentContentType?.name
  const usesContextDocument = !source.id && source.contentType === contextSource?.contentType.name
  const sourceContentType = usesCurrentRecord
    ? currentContentType
    : usesContextDocument
      ? contextSource?.contentType
      : getAllowedSourceContentType(source.contentType)
  if (!sourceContentType) {
    return undefined
  }

  const sourceDocument = usesCurrentRecord
    ? currentSource
    : usesContextDocument
      ? contextSource?.value
      : await loadSourceDocument(db, source)
  if (!sourceDocument) return undefined

  if (source.virtual === 'href') {
    const sourceId = typeof sourceDocument._id === 'string' ? sourceDocument._id : source.id
    return sourceId ? await resolveHref(source, sourceId) : undefined
  }

  if (!isDynamicSourcePathAllowed(sourceContentType, source.path)) {
    return undefined
  }

  return getAtPath(sourceDocument, source.path)
}

const isRelatedCollectionSource = (
  source: DynamicListMapSource
): source is DynamicRelatedCollectionSource =>
  'kind' in source && source.kind === 'relatedCollection'

const isNestedListSource = (source: DynamicListMapSource): source is DynamicNestedListSource =>
  'kind' in source && source.kind === 'list'

const addPublicContentFilter = (query: Query): Query => ({
  ...query,
  filter: {
    ...query.filter,
    _trashed: { $ne: true },
    _visibility: { $nin: ['draft', 'trash'] },
  },
})

type DynamicQueryValueResolution = { success: true; value: unknown } | { success: false }

const isDynamicQueryCurrentPathAllowed = (contentType: ContentType, path: string) =>
  path === '_id' || isDynamicSourcePathAllowed(contentType, path)

const resolveDynamicQueryValue = (
  value: unknown,
  currentItem: Record<string, unknown>,
  currentItemContentType: ContentType,
  currentDocument: Record<string, unknown>,
  currentDocumentContentType: ContentType
): DynamicQueryValueResolution => {
  const currentValue = DynamicQueryCurrentValueSchema.safeParse(value)
  if (currentValue.success) {
    const path = currentValue.data.$current
    if (!isDynamicQueryCurrentPathAllowed(currentItemContentType, path)) {
      return { success: false }
    }

    const resolved = getAtPath(currentItem, path)
    return resolved === undefined ? { success: false } : { success: true, value: resolved }
  }

  const documentValue = DynamicQueryDocumentValueSchema.safeParse(value)
  if (documentValue.success) {
    const path = documentValue.data.$document
    if (!isDynamicQueryCurrentPathAllowed(currentDocumentContentType, path)) {
      return { success: false }
    }

    const resolved = getAtPath(currentDocument, path)
    return resolved === undefined ? { success: false } : { success: true, value: resolved }
  }

  if (Array.isArray(value)) {
    const items: unknown[] = []
    for (const item of value) {
      const resolved = resolveDynamicQueryValue(
        item,
        currentItem,
        currentItemContentType,
        currentDocument,
        currentDocumentContentType
      )
      if (!resolved.success) return resolved
      items.push(resolved.value)
    }

    return { success: true, value: items }
  }

  if (isRecord(value) && !(value instanceof Date)) {
    const entries: Array<[string, unknown]> = []
    for (const [key, item] of Object.entries(value)) {
      const resolved = resolveDynamicQueryValue(
        item,
        currentItem,
        currentItemContentType,
        currentDocument,
        currentDocumentContentType
      )
      if (!resolved.success) return resolved
      entries.push([key, resolved.value])
    }

    return { success: true, value: Object.fromEntries(entries) }
  }

  return { success: true, value }
}

export const resolveRelatedCollectionValue = async ({
  db,
  source,
  currentSource,
  currentContentType,
  populateDocument = async (sourceItem: DBOutput<ContentType>) =>
    (await populateRelations(await populateFields(sourceItem))) as Record<string, unknown>,
}: {
  db: DBService
  source: DynamicRelatedCollectionSource
  currentSource: Record<string, unknown>
  currentContentType: ContentType
  populateDocument?: (sourceItem: DBOutput<ContentType>) => Promise<Record<string, unknown>>
}) => {
  if (!isDynamicDataSourceContentTypeAllowed(currentContentType)) {
    return undefined
  }

  const sourceId = currentSource._id
  if (typeof sourceId !== 'string') return undefined

  const relatedContentType = getAllowedSourceContentType(source.contentType)
  if (!relatedContentType) return undefined

  const relationField = relatedContentType.fields[source.relation]
  const relationTarget = getRelationTarget(relationField)
  if (
    !relationTarget ||
    relationTarget.name !== currentContentType.name ||
    !relatedContentType.allowsDynamicBindingForField(source.relation)
  ) {
    return undefined
  }

  const sourceField = getDynamicSourceField(relatedContentType, source.path)
  if (!isArraySourceField(sourceField)) return undefined

  const query = addPublicContentFilter(
    parseSafeManagerQuery(relatedContentType, {
      filter: { [`${source.relation}._id`]: sourceId },
      options: {
        limit: source.limit,
        sort: source.sort,
      },
    })
  )
  const sourceItems = (await db.list(relatedContentType, query)).items
  const values = await Promise.all(
    sourceItems.map(async (sourceItem) => {
      const populated = await populateDocument(sourceItem as DBOutput<ContentType>)

      return getAtPath(populated, source.path)
    })
  )

  return values.flatMap((value) => (Array.isArray(value) ? value : []))
}

const resolveListMapSourceValue = async ({
  db,
  source,
  targetField,
  currentSource,
  currentContentType,
  contextSource,
}: {
  db: DBService
  source: DynamicListMapSource
  targetField?: ContentType['fields'][string]
  currentSource: Record<string, unknown>
  currentContentType: ContentType
  contextSource?: ResolveOptions['contextSource']
}): Promise<unknown> => {
  if (isNestedListSource(source)) {
    if (!targetField || !getDynamicListTarget(targetField, source.itemName)) {
      return undefined
    }

    return await resolveListBinding({
      db,
      binding: source,
      contextSource,
      currentDocument: currentSource,
      currentDocumentContentType: currentContentType,
      targetField,
    })
  }

  if (isRelatedCollectionSource(source)) {
    return await resolveRelatedCollectionValue({
      db,
      source,
      currentSource,
      currentContentType,
    })
  }

  return await resolveSourceValue({
    db,
    source,
    currentSource,
    currentContentType,
    allowCurrentSource: true,
    contextSource,
  })
}

const resolveListBinding = async ({
  db,
  binding,
  contextSource,
  currentDocument,
  currentDocumentContentType,
  targetField,
}: {
  db: DBService
  binding: DynamicListBinding
  contextSource?: ResolveOptions['contextSource']
  currentDocument: Record<string, unknown>
  currentDocumentContentType: ContentType
  targetField: ContentType['fields'][string]
}): Promise<unknown[] | undefined> => {
  const documentSource = binding.source
  const rootDocumentSource = contextSource ?? {
    contentType: currentDocumentContentType,
    value: currentDocument,
  }
  const sourceContentType = documentSource
    ? getContentTypeByName(binding.contentType)
    : getAllowedSourceContentType(binding.contentType)
  if (!sourceContentType) {
    return undefined
  }
  const target = getDynamicListTarget(targetField, binding.itemName)
  if (!target) return undefined

  let sourceItems: unknown[]

  if (documentSource) {
    if (documentSource.contentType !== currentDocumentContentType.name) {
      return undefined
    }

    const sourceField = getDynamicSourceField(currentDocumentContentType, documentSource.path)
    const itemContentType = getDocumentListItemContentType(sourceField, documentSource.itemName)
    if (itemContentType?.name !== sourceContentType.name) {
      return undefined
    }

    const value = getAtPath(currentDocument, documentSource.path)
    if (!Array.isArray(value)) return undefined

    sourceItems = documentSource.itemName
      ? value.flatMap((item) =>
          isRecord(item) && item.name === documentSource.itemName && 'value' in item
            ? [item.value]
            : []
        )
      : value
  } else {
    const resolvedFilter = resolveDynamicQueryValue(
      binding.query?.filter ?? {},
      currentDocument,
      currentDocumentContentType,
      rootDocumentSource.value,
      rootDocumentSource.contentType
    )
    if (!resolvedFilter.success || !isRecord(resolvedFilter.value)) {
      return []
    }

    const query = addPublicContentFilter(
      parseSafeManagerQuery(sourceContentType, {
        ...binding.query,
        filter: resolvedFilter.value,
      })
    )
    sourceItems = (await db.list(sourceContentType, query)).items
  }

  const resolvedItems: Array<unknown | undefined> = await Promise.all(
    sourceItems.map(async (sourceItem, index): Promise<unknown | undefined> => {
      if (!isRecord(sourceItem)) return undefined

      const populated = documentSource
        ? sourceItem
        : ((await populateRelations(
            await populateFields(sourceItem as DBOutput<ContentType>)
          )) as Record<string, unknown>)
      const mappedEntries = await Promise.all(
        Object.entries(binding.map).map(
          async ([targetPath, source]) =>
            [
              targetPath,
              await resolveListMapSourceValue({
                db,
                source,
                targetField:
                  target.kind === 'linkArray'
                    ? undefined
                    : getDynamicTargetField(target.contentType, targetPath),
                currentSource: populated,
                currentContentType: sourceContentType,
                contextSource: rootDocumentSource,
              }),
            ] as const
        )
      )
      const mapped: Record<string, unknown> = {}
      mappedEntries
        .sort(([left], [right]) => left.split('.').length - right.split('.').length)
        .forEach(([targetPath, value]) => setAtPath(mapped, targetPath, value))

      if (target.kind === 'linkArray') return mapped

      const targetValue = {
        _id:
          typeof sourceItem._id === 'string'
            ? `${binding.itemName}:${sourceItem._id}`
            : `${binding.itemName}:${index}`,
        _type: target.contentType.name,
        ...mapped,
      }

      if (target.kind === 'relationArray') return targetValue

      return {
        name: binding.itemName,
        value: targetValue,
      }
    })
  )

  return resolvedItems.filter((item) => item !== undefined)
}

const getBlocksTargetContentType = (
  field: ContentType['fields'][string] | undefined,
  itemName: string
) => {
  if (!field || field.meta.capabilities.dynamic?.collection !== 'heterogeneous') {
    return undefined
  }

  if (!('fields' in field) || !Array.isArray(field.fields)) {
    return undefined
  }

  const entry = field.fields.find((item) => item.name === itemName)
  if (
    !entry ||
    entry.field.meta.capabilities.dynamic?.relation !== true ||
    !('contentType' in entry.field)
  ) {
    return undefined
  }

  return entry.field.contentType as ContentType
}

type DynamicListTarget =
  | {
      kind: 'blocks' | 'relationArray'
      contentType: ContentType
    }
  | {
      kind: 'linkArray'
    }

const getSimpleListItemField = (field: ContentType['fields'][string] | undefined) => {
  if (
    !field ||
    field.meta.capabilities.dynamic?.collection !== 'homogeneous' ||
    !('field' in field)
  ) {
    return undefined
  }

  return field.field as ContentType['fields'][string]
}

const getDynamicListTarget = (
  field: ContentType['fields'][string] | undefined,
  itemName: string
): DynamicListTarget | undefined => {
  const blocksContentType = getBlocksTargetContentType(field, itemName)
  if (blocksContentType) {
    return { kind: 'blocks', contentType: blocksContentType }
  }

  const itemField = getSimpleListItemField(field)
  if (!itemField) return undefined

  if (itemField.meta.capabilities.dynamic?.relation === true && 'contentType' in itemField) {
    const contentType = itemField.contentType as ContentType
    if (itemName !== contentType.name) return undefined

    return {
      kind: 'relationArray',
      contentType,
    }
  }

  const itemTypeName = itemField.meta.editor ?? itemField.meta.type
  return itemField.meta.capabilities.dynamic?.mapProperties === true &&
    itemField.meta.capabilities.dynamic?.properties &&
    itemName === itemTypeName
    ? { kind: 'linkArray' }
    : undefined
}

export const getDynamicListItemContentTypeName = (
  field: ContentType['fields'][string] | undefined,
  itemName: string
) => {
  const target = getDynamicListTarget(field, itemName)
  return target && target.kind !== 'linkArray' ? target.contentType.name : itemName
}

const filterListBindingMap = (
  contentType: ContentType,
  fieldName: string,
  binding: DynamicListBinding
): DynamicListBinding => {
  return filterListBindingForTarget(contentType.fields[fieldName], binding)
}

const filterListBindingForTarget = (
  targetField: ContentType['fields'][string] | undefined,
  binding: DynamicListBinding
): DynamicListBinding => {
  const target = getDynamicListTarget(targetField, binding.itemName)
  if (!target) return { ...binding, map: {} }

  return {
    ...binding,
    map: Object.fromEntries(
      Object.entries(binding.map).flatMap(([targetPath, source]) => {
        if (target.kind === 'linkArray') {
          return targetField &&
            'field' in targetField &&
            !!(targetField.field as ContentType['fields'][string]).meta.capabilities.dynamic
              ?.properties?.[targetPath] &&
            !isNestedListSource(source)
            ? [[targetPath, source]]
            : []
        }

        const field = getDynamicTargetField(target.contentType, targetPath)
        if (!field) {
          return []
        }

        if (!isNestedListSource(source)) {
          return [[targetPath, source]]
        }

        if (targetPath.includes('.')) return []

        const nestedTarget = getDynamicListTarget(field, source.itemName)
        return nestedTarget ? [[targetPath, filterListBindingForTarget(field, source)]] : []
      })
    ),
  }
}

const getListItemStableKey = (item: unknown): string | undefined => {
  if (!isRecord(item)) return undefined

  const name = typeof item.name === 'string' ? item.name : ''
  const value = item.value

  if (isRecord(value) && typeof value._id === 'string') {
    const id = value._id.startsWith(`${name}:`) ? value._id.slice(name.length + 1) : value._id
    return `${name}:${id}`
  }

  if (isRecord(value) && isRecord(value.data) && typeof value.data._id === 'string') {
    return `${name}:${value.data._id}`
  }

  return undefined
}

const isListValueItem = (item: unknown): item is { name: string; value: unknown } =>
  isRecord(item) &&
  typeof item.name === 'string' &&
  Object.prototype.hasOwnProperty.call(item, 'value') &&
  item.value !== undefined

export const mergeDynamicListItems = (currentValue: unknown, resolvedValue: unknown) => {
  const currentItems = Array.isArray(currentValue) ? currentValue.filter(isListValueItem) : []
  const resolvedItems = Array.isArray(resolvedValue) ? resolvedValue.filter(isListValueItem) : []
  const seen = new Set<string>()
  const merged: unknown[] = []

  for (const item of [...resolvedItems, ...currentItems]) {
    const key = getListItemStableKey(item)
    if (key) {
      if (seen.has(key)) continue
      seen.add(key)
    }

    merged.push(item)
  }

  return merged
}

export const mergeDynamicArrayItems = (currentValue: unknown, resolvedValue: unknown) => {
  const currentItems = Array.isArray(currentValue) ? currentValue : []
  const resolvedItems = Array.isArray(resolvedValue) ? resolvedValue : []
  const seenIds = new Set<string>()

  return [...resolvedItems, ...currentItems].filter((item) => {
    if (!isRecord(item) || typeof item._id !== 'string') return true
    if (seenIds.has(item._id)) return false

    seenIds.add(item._id)
    return true
  })
}

const resolveRecordBindings = async ({
  db,
  contentType,
  value,
  contextSource,
}: {
  db: DBService
  contentType: ContentType
  value: Record<string, unknown>
  contextSource?: ResolveOptions['contextSource']
}) => {
  const bindings = getDynamicDocumentBindings(value[DYNAMIC_BINDINGS_FIELD_NAME])
  if (!bindings) return value

  const next = { ...value }

  for (const [field, source] of Object.entries(bindings.fields ?? {})) {
    if (!contentType.allowsDynamicBindingForField(field)) continue

    try {
      const resolved = await resolveSourceValue({
        db,
        source,
        currentSource: value,
        currentContentType: contentType,
        contextSource,
      })
      if (resolved !== undefined) {
        next[field] = resolved
      }
    } catch (error) {
      Logger.error('dynamicData: field binding failed', error as Error)
    }
  }

  for (const [field, binding] of Object.entries(bindings.lists ?? {})) {
    if (!contentType.allowsDynamicBindingForField(field)) continue

    try {
      const targetField = contentType.fields[field]
      const filteredBinding = filterListBindingMap(contentType, field, binding)
      const resolved = await resolveListBinding({
        db,
        binding: filteredBinding,
        contextSource,
        currentDocument: contextSource?.value ?? next,
        currentDocumentContentType: contextSource?.contentType ?? contentType,
        targetField,
      })
      if (resolved !== undefined) {
        next[field] =
          targetField.meta.capabilities.dynamic?.collection === 'homogeneous'
            ? mergeDynamicArrayItems(next[field], resolved)
            : mergeDynamicListItems(next[field], resolved)
      }
    } catch (error) {
      Logger.error('dynamicData: list binding failed', error as Error)
    }
  }

  return next
}

export const resolveDynamicData = async <T>(value: T, options: ResolveOptions): Promise<T> => {
  if (Array.isArray(value)) {
    return (await Promise.all(value.map((item) => resolveDynamicData(item, options)))) as T
  }

  if (!isRecord(value)) return value

  const contentType =
    options.contentType ??
    (typeof value._type === 'string' ? getContentTypeByName(value._type) : undefined)
  const boundValue = contentType
    ? await resolveRecordBindings({
        db: options.db,
        contentType,
        value,
        contextSource: options.contextSource,
      })
    : value
  const contextSource =
    options.contextSource ??
    (contentType
      ? {
          contentType,
          value: boundValue,
        }
      : undefined)

  const entries = await Promise.all(
    Object.entries(boundValue).map(async ([key, item]) => [
      key,
      await resolveDynamicData(item, {
        ...options,
        contextSource,
        contentType: undefined,
      }),
    ])
  )

  return Object.fromEntries(entries) as T
}

export const stripDynamicBindings = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripDynamicBindings(item)) as T
  }

  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== DYNAMIC_BINDINGS_FIELD_NAME)
      .map(([key, item]) => [key, stripDynamicBindings(item)])
  ) as T
}

export const resolveContentOutput = async <T extends ContentType>({
  db,
  contentType,
  data,
  surface,
}: {
  db: DBService
  contentType: T
  data: DataPopulatedWithoutApiOnly<T>
  surface: 'web' | 'preview'
}) => {
  const dynamicData = await resolveDynamicData(data, {
    db,
    contentType,
    surface,
  })
  const hooked = await runOnGetHook({
    db,
    contentType,
    data: dynamicData,
    surface,
  })

  const stripped = stripDynamicBindings(hooked)
  const breadcrums = getContentHookContext().route?.breadcrums ?? null

  return resolveBreadcrumsFields(contentType, stripped, breadcrums)
}
