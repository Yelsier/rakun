import type { RefAttributes } from 'react'
import type z from 'zod'
import type { FieldUIType } from '@rakun/core/lib/fields/Field'
import type { EncodedContentReferenceField } from '@rakun/core/lib/fields/ContentReference'
import { useQuery } from '@tanstack/react-query'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import { DefaultProps } from '../shared'
import ContentReferenceMultiSelectUI from './ContentReferenceMultiSelectUI'
import ContentReferenceSelectUI from './ContentReferenceSelectUI'

import { useTRPC } from '@/components/trpc-provider'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

export type ContentReferenceProps = EncodedContentReferenceField & DefaultProps

export type ContentReferencePropsRef = ContentReferenceProps &
  RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<ContentReferencePropsRef>
} = {
  ContentTypeSelect: ContentReferenceSelectUI,
  ContentTypeMultiSelect: ContentReferenceMultiSelectUI,
}

export const useContentReferenceOptions = (
  contentType: EncodedContentReferenceField['contentType'],
) => {
  const trpc = useTRPC()
  const { getTranslation } = useLanguage()
  const labelField = contentType.listFields?.[0] || '_id'

  const { data } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: contentType.name,
      query: {
        options: {
          limit: 'all',
          fields: [labelField],
        },
      },
    }),
  )

  const queryData = data as
    | { items?: Array<Record<string, unknown> & { _id: string }> }
    | undefined
  const options = ((queryData?.items ?? []) as Array<Record<string, unknown> & { _id: string }>)
    .map((item) => ({
      value: item._id,
      label: String(getTranslation(item[labelField]) || item._id),
    }))

  return {
    contentTypeName: contentType.name,
    options,
  }
}

const ContentReferenceField = (
  config: ContentReferencePropsRef,
): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}

export default ContentReferenceField
