import type {
  EncodedListFieldItem,
  EncodedRelationField,
  RelationFieldValue,
} from '@rakun-kit/core/client'
import type { MaybeTranslatableValue } from '@rakun-kit/core/types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object')

const isRelationValue = (value: unknown): value is RelationFieldValue =>
  isRecord(value) && 'type' in value && (value.type === 'new' || value.type === 'existing')

const getRelationField = (
  field: EncodedListFieldItem['field'],
): EncodedRelationField | undefined =>
  field.config.type === 'Relation' ? (field as EncodedRelationField) : undefined

export const getFirstRequiredFieldName = (
  contentType: EncodedRelationField['contentType'] | undefined,
): string | undefined => {
  if (!contentType?.fields) return undefined

  for (const [name, field] of Object.entries(contentType.fields)) {
    if (field.visibility === 'api') continue
    if (field.isRequired) return name
  }

  return undefined
}

const formatLabelValue = (
  value: unknown,
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T,
): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined

  const translated = getTranslation(value as MaybeTranslatableValue<unknown>)

  if (typeof translated === 'string') {
    const trimmed = translated.trim()
    return trimmed || undefined
  }

  if (typeof translated === 'number' && Number.isFinite(translated)) {
    return String(translated)
  }

  if (typeof translated === 'boolean') {
    return translated ? 'true' : 'false'
  }

  if (isRecord(translated)) {
    if (typeof translated.title === 'string' && translated.title.trim()) {
      return translated.title.trim()
    }
    if (typeof translated.label === 'string' && translated.label.trim()) {
      return translated.label.trim()
    }
    if (typeof translated.name === 'string' && translated.name.trim()) {
      return translated.name.trim()
    }
    if (typeof translated.url === 'string' && translated.url.trim()) {
      return translated.url.trim()
    }
  }

  return undefined
}

const readRelationData = (value: unknown): Record<string, unknown> | undefined => {
  if (!isRelationValue(value)) {
    return isRecord(value) ? value : undefined
  }

  if (value.type === 'new' && isRecord(value.data)) {
    return value.data
  }

  if (value.type === 'existing') {
    const existing = value as RelationFieldValue & { data?: unknown }
    if (isRecord(existing.data)) {
      return existing.data
    }
  }

  return undefined
}

export const getModuleDistinguishingLabel = (
  field: EncodedListFieldItem['field'],
  value: unknown,
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T,
): string | undefined => {
  const relationField = getRelationField(field)
  const fieldName = getFirstRequiredFieldName(relationField?.contentType)
  if (!fieldName) return undefined

  const data = readRelationData(value)
  if (!data) return undefined

  return formatLabelValue(data[fieldName], getTranslation)
}

export const resolveModuleItemTitle = ({
  typeTitle,
  distinguishingLabel,
}: {
  typeTitle: string
  distinguishingLabel?: string
}): string => {
  if (distinguishingLabel) return distinguishingLabel
  return typeTitle
}
