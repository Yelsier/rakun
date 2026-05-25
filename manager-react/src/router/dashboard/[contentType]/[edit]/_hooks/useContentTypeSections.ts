import { useMemo } from 'react'
import type { EncodedContentType, EncodedField } from '@rakun-kit/core/client'
import { Seo } from '@rakun-kit/core/internal-content-types'

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

    for (const [fieldName, fieldValue] of Object.entries(contentType.fields)) {
      if (fieldValue.config.ui === 'Iterator') {
        iterables.fields[fieldName] = fieldValue
      } else if (
        'contentType' in fieldValue &&
        (fieldValue.contentType as EncodedContentType).name === Seo.name
      ) {
        seo.fields[fieldName] = fieldValue
      } else {
        nonIterables.fields[fieldName] = fieldValue
      }
    }

    return {
      iterables,
      hasIterables: Object.keys(iterables.fields).length > 0,
      nonIterables,
      hasNonIterables: Object.keys(nonIterables.fields).length > 0,
      seo,
      hasSeo: Object.keys(seo.fields).length > 0,
    }
  }, [contentType])
