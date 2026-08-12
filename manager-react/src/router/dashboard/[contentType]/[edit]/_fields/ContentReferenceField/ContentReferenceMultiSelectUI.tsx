'use client'

import { CheckIcon } from 'lucide-react'

import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import { ItemLimitStatus } from '../shared/ItemLimitStatus'
import type { ContentReferencePropsRef } from '.'
import { useContentReferenceOptions } from '.'
import { useTranslations } from '@/i18n'

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
  dynamicFallbackPlaceholder,
  ref,
  contentType,
  minItems,
  maxItems,
}) => {
  const t = useTranslations()
  const { value, getValue, errors, cleanErrors, getState, onValueChange } =
    useFieldValues<string[]>({
      id,
      isRequired,
      isTranslatable,
      defaultData: defaultData as DefaultDataTypes<string[]>,
      defaultValue: [],
      validateValue: (nextValue) => {
        if (minItems !== undefined && nextValue.length < minItems) {
          return t('contentEdit.minimumItemsError', { count: minItems })
        }
        if (maxItems !== undefined && nextValue.length > maxItems) {
          return t('contentEdit.maximumItemsError', { count: maxItems })
        }
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
    if (maxItems !== undefined && value.length >= maxItems) return

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
      <div className='grid gap-1.5'>
      <Tags>
        <TagsTrigger>
          {value.map((selectedId) => (
            <TagsValue key={selectedId} onRemove={() => handleRemove(selectedId)}>
              {labelsById.get(selectedId) || selectedId}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput
            placeholder={dynamicFallbackPlaceholder ?? `Search ${contentTypeName}...`}
          />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {options.map((option) => (
                <TagsItem
                  disabled={
                    !value.includes(option.value) &&
                    maxItems !== undefined &&
                    value.length >= maxItems
                  }
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
        <ItemLimitStatus
          count={value.length}
          minItems={minItems}
          maxItems={maxItems}
        />
      </div>
    </FieldWrapper>
  )
}

export default ContentReferenceMultiSelectUI
