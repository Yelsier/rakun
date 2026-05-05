import type { MaybeTranslatableValue } from '@rakun-kit/core/types'
import type { Id } from '@rakun-kit/core'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  RelationExistingDefaltData,
  RelationFieldValue,
} from '@rakun-kit/core'

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
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { useTRPC } from '@/components/trpc-provider'
import { useEditErrorStore } from '@/hooks/app-store'

const isRelationExistingDefaultData = (
  data: RelationFieldValue,
): data is RelationExistingDefaltData => {
  return data?.type === 'existing'
}

const ExistingRelation: React.FC<RelationPropsRef> = ({ ref, ...props }) => {
  const [value, setValue] = useState<string>(
    isRelationExistingDefaultData(props.defaultData as RelationFieldValue)
      ? (props.defaultData as RelationExistingDefaltData)?._id
      : '',
  )
  const { getTranslation } = useLanguage()
  const { removeRelatedErrors } = useEditErrorStore()

  const getValue = () => {
    return value
      ? {
          type: 'existing',
          _id: value,
          contentType: props.contentType.name,
        }
      : null
  }

  const field = props.contentType.listFields?.[0] || '_id'

  const trpc = useTRPC()

  const { data, error, isPending } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: props.contentType.name,
      query: {
        options: {
          limit: 'all',
          fields: [field],
        },
      },
    }),
  )

  if (!data || isPending) {
    return <Loading />
  }

  if (error) {
    return <ErrorMessage {...extractErrorProps(error)} />
  }

  const { items } = (data as {
    items: { _id: Id; [key: string]: MaybeTranslatableValue<string> }[]
  })

  const values = (
    items as { _id: Id; [key: string]: MaybeTranslatableValue<string> }[]
  ).map((item) => ({
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
        value={value ?? ''}
        onValueChange={(nextValue) => {
          setValue(nextValue)
          removeRelatedErrors(props.id)
        }}
        data={values}
        type={decodeCamelCase(props.contentType.name)}
      >
        <ComboboxTrigger className='w-full' />
        <ComboboxContent>
          <ComboboxInput />
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

export default ExistingRelation
