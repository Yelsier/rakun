'use client'

import { CheckIcon } from 'lucide-react'

import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import type { SelectPropsRef } from '.'

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
  defaultData,
  ref,
}) => {
  const { value, getValue, errors, cleanErrors, getState, onValueChange } =
    useFieldValues<string[]>({
      id,
      isRequired,
      isTranslatable,
      defaultData: defaultData as DefaultDataTypes<string[]>,
      defaultValue: [],
      validateValue: (value) => {
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
      <Tags>
        <TagsTrigger>
          {value.map((tag) => (
            <TagsValue key={tag} onRemove={() => handleRemove(tag)}>
              {options.find((t) => t === tag)}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput placeholder='Search tag...' />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {options.map((tag) => (
                <TagsItem key={tag} onSelect={handleSelect} value={tag}>
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
    </FieldWrapper>
  )
}

export default MultiSelectUI
