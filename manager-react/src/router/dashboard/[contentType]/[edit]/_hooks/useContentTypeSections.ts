import { useMemo } from 'react'
import {
  ITERATOR_FIELD_NAME,
  SEO_FIELD_NAME,
  type EncodedContentType,
  type EncodedField,
} from '@rakun-kit/core/client'

export type ContentTypeSections = {
  iterables: EncodedContentType
  hasIterables: boolean
  nonIterables: EncodedContentType
  hasNonIterables: boolean
  seo: EncodedContentType
  hasSeo: boolean
}

export const useContentTypeSections = (
  contentType: EncodedContentType,
): ContentTypeSections =>
  useMemo(() => {
    const iterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    }
    const nonIterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    }
    const seo = { ...contentType, fields: {} as Record<string, EncodedField> }

    const hasIterator = Boolean(contentType.hasIterator)
    const hasSeo = Boolean(contentType.hasSeo)

    for (const [fieldName, fieldValue] of Object.entries(contentType.fields)) {
      if (hasIterator && fieldName === ITERATOR_FIELD_NAME) {
        iterables.fields[fieldName] = fieldValue
      } else if (hasSeo && fieldName === SEO_FIELD_NAME) {
        seo.fields[fieldName] = fieldValue
      } else {
        nonIterables.fields[fieldName] = fieldValue
      }
    }

    return {
      iterables,
      hasIterables: hasIterator && Object.keys(iterables.fields).length > 0,
      nonIterables,
      hasNonIterables: Object.keys(nonIterables.fields).length > 0,
      seo,
      hasSeo: hasSeo && Object.keys(seo.fields).length > 0,
    }
  }, [contentType])
