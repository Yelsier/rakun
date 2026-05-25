import { useMemo } from 'react'
import type { EncodedField } from '@rakun-kit/core/client'

import type { ContentTypeSections } from './useContentTypeSections'

type EditError = {
  id: string
}

const hasErrorsInFields = ({
  contentTypeName,
  editErrors,
  fields,
}: {
  contentTypeName: string
  editErrors: EditError[]
  fields: Record<string, EncodedField>
}) =>
  Object.keys(fields).some((fieldName) => {
    const rootId = `${contentTypeName}.${fieldName}`
    return editErrors.some((error) => error.id === rootId || error.id.startsWith(`${rootId}.`))
  })

export const useEditTabErrors = ({
  contentTypeName,
  editErrors,
  sections,
}: {
  contentTypeName: string
  editErrors: EditError[]
  sections: ContentTypeSections
}) =>
  useMemo(
    () => ({
      info: hasErrorsInFields({
        contentTypeName,
        editErrors,
        fields: sections.nonIterables.fields,
      }),
      content: hasErrorsInFields({
        contentTypeName,
        editErrors,
        fields: sections.iterables.fields,
      }),
      seo: hasErrorsInFields({
        contentTypeName,
        editErrors,
        fields: sections.seo.fields,
      }),
    }),
    [
      contentTypeName,
      editErrors,
      sections.iterables.fields,
      sections.nonIterables.fields,
      sections.seo.fields,
    ],
  )
