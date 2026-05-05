'use client'

import { CheckIcon } from 'lucide-react'

import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import type { ContentReferencePropsRef } from '.'
import { useContentReferenceOptions } from '.'

import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'

const ContentReferenceMultiSelectUI: React.FC<ContentReferencePropsRef> = ({
  id,
  isRequired,
  isTranslatable,
  defaultData,
  ref,
  contentType,
}) => {
  const { value, getValue, errors, cleanErrors, getState, onValueChange } =
    useFieldValues<string[]>({
      id,
      isRequired,
      isTranslatable,
      defaultData: defaultData as DefaultDataTypes<string[]>,
      defaultValue: [],
      validateValue: (nextValue) => {
        if (isRequired && nextValue.length === 0) {
          return 'This field is required'
        }
        return null
      },
    })
  const { options, contentTypeName } = useContentReferenceOptions(contentType)
  const labelsById = new Map(
    options.map((option) => [option.value, option.label] as const),
  )

  const handleRemove = (removeId: string) => {
    if (!value.includes(removeId)) return
    onValueChange(value.filter((item) => item !== removeId))
    cleanErrors()
  }

  const handleToggle = (toggleId: string) => {
    if (value.includes(toggleId)) {
      handleRemove(toggleId)
      return
    }

    onValueChange([...value, toggleId])
    cleanErrors()
  }

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      <Tags>
        <TagsTrigger>
          {value.map((selectedId) => (
            <TagsValue key={selectedId} onRemove={() => handleRemove(selectedId)}>
              {labelsById.get(selectedId) || selectedId}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput placeholder={`Search ${contentTypeName}...`} />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {options.map((option) => (
                <TagsItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleToggle}
                >
                  {option.label}
                  {value.includes(option.value) ? (
                    <CheckIcon className='text-muted-foreground' size={14} />
                  ) : null}
                </TagsItem>
              ))}
            </TagsGroup>
          </TagsList>
        </TagsContent>
      </Tags>
    </FieldWrapper>
  )
}

export default ContentReferenceMultiSelectUI
