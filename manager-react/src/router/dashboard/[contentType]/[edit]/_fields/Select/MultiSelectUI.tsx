'use client'

import { CheckIcon } from 'lucide-react'

import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import { ItemLimitStatus } from '../shared/ItemLimitStatus'
import type { SelectPropsRef } from '.'
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

const MultiSelectUI: React.FC<SelectPropsRef> = ({
  id,
  isRequired,
  isTranslatable,
  options,
  minItems,
  maxItems,
  defaultData,
  dynamicFallbackPlaceholder,
  ref,
}) => {
  const t = useTranslations()
  const { value, getValue, errors, cleanErrors, getState, onValueChange } =
    useFieldValues<string[]>({
      id,
      isRequired,
      isTranslatable,
      defaultData: defaultData as DefaultDataTypes<string[]>,
      defaultValue: [],
      validateValue: (value) => {
        if (minItems !== undefined && value.length < minItems) {
          return t('contentEdit.minimumItemsError', { count: minItems })
        }
        if (maxItems !== undefined && value.length > maxItems) {
          return t('contentEdit.maximumItemsError', { count: maxItems })
        }
        if (isRequired && value.length === 0) {
          return 'This field is required'
        }
        return null
      },
    })

  const handleRemove = (remove: string) => {
    if (!value.includes(remove)) {
      return
    }
    onValueChange(value.filter((v) => v !== remove))
    cleanErrors()
  }

  const handleSelect = (select: string) => {
    if (value.includes(select)) {
      handleRemove(select)
      return
    }
    if (maxItems !== undefined && value.length >= maxItems) return
    onValueChange([...value, select])
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
          {value.map((tag) => (
            <TagsValue key={tag} onRemove={() => handleRemove(tag)}>
              {options.find((t) => t === tag)}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput placeholder={dynamicFallbackPlaceholder ?? 'Search tag...'} />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {options.map((tag) => (
                <TagsItem
                  disabled={
                    !value.includes(tag) &&
                    maxItems !== undefined &&
                    value.length >= maxItems
                  }
                  key={tag}
                  onSelect={handleSelect}
                  value={tag}
                >
                  {tag}
                  {value.includes(tag) && (
                    <CheckIcon className='text-muted-foreground' size={14} />
                  )}
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

export default MultiSelectUI
