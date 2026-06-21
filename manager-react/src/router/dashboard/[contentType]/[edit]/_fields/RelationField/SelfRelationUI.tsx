import type { MaybeTranslatableValue } from '@rakun-kit/core/types'
import type { Id } from '@rakun-kit/core/client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { RelationPropsRef } from '.'
import Loading from '../../../../../../components/loading'
import { FieldWrapper } from '../shared/FieldWrapper'

import ErrorMessage, { extractErrorProps } from '@/components/error'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/shadcn-io/combobox'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { useEditErrorStore } from '@/hooks/app-store'
import { useTRPC } from '@/components/trpc-provider'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type SelfRelationDefaultData = {
  type: 'self'
  _id: string
  contentType: string
}

const isSelfRelationDefaultData = (
  data: unknown,
): data is SelfRelationDefaultData => {
  return (
    !!data &&
    typeof data === 'object' &&
    'type' in data &&
    data.type === 'self' &&
    '_id' in data &&
    typeof data._id === 'string'
  )
}

const SelfRelationUI: React.FC<RelationPropsRef> = ({ ref, ...props }) => {
  const contentType = props.parentContentType
  const [value, setValue] = useState<string>(
    isSelfRelationDefaultData(props.defaultData) ? props.defaultData._id : '',
  )
  const { getTranslation } = useLanguage()
  const { removeRelatedErrors } = useEditErrorStore()
  const trpc = useTRPC()

  const field = contentType?.listFields?.[0] || '_id'

  const { data, error, isPending } = useQuery({
    ...trpc.manager.list.queryOptions(
      contentType
        ? {
            contentType: contentType.name,
            query: {
              options: {
                limit: 'all',
                fields: [field],
              },
            },
          }
        : {
            contentType: '',
            query: {
              options: {
                limit: 'all',
                fields: [field],
              },
            },
          },
    ),
    enabled: !!contentType,
  })

  const getValue = () => {
    if (!value) {
      return props.isRequired ? { _error: 'This field is required' } : null
    }

    return {
      type: 'self',
      _id: value,
      contentType: contentType?.name,
    }
  }

  if (!contentType) {
    return (
      <FieldWrapper
        id={props.id}
        errors={[]}
        getValue={getValue}
        getState={getValue}
        ref={ref}
      >
        <ErrorMessage
          _tag='SelfRelationError'
          message='Self relation needs a parent content type.'
        />
      </FieldWrapper>
    )
  }

  if (!data || isPending) {
    return <Loading />
  }

  if (error) {
    return <ErrorMessage {...extractErrorProps(error)} />
  }

  const { items } = data as {
    items: { _id: Id; [key: string]: MaybeTranslatableValue<string> }[]
  }

  const values = items.map((item) => ({
    value: item._id,
    label: getTranslation(item[field]) || item._id,
  }))

  return (
    <FieldWrapper
      id={props.id}
      errors={[]}
      getValue={getValue}
      getState={getValue}
      ref={ref}
    >
      <Combobox
        value={value}
        onValueChange={(nextValue) => {
          setValue(nextValue)
          removeRelatedErrors(props.id)
        }}
        data={values}
        type={decodeCamelCase(contentType.name)}
      >
        <ComboboxTrigger
          className='w-full'
          placeholder={props.dynamicFallbackPlaceholder}
        />
        <ComboboxContent>
          <ComboboxInput placeholder={props.dynamicFallbackPlaceholder} />
          <ComboboxEmpty />
          <ComboboxList>
            <ComboboxGroup>
              {values.map((v) => (
                <ComboboxItem
                  keywords={[v.label]}
                  key={v.value}
                  value={v.value}
                >
                  {v.label}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </FieldWrapper>
  )
}

export default SelfRelationUI
