'use client'

import { X } from 'lucide-react'

import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'
import type { ContentReferencePropsRef } from '.'
import { useContentReferenceOptions } from '.'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ContentReferenceSelectUI: React.FC<ContentReferencePropsRef> = ({
  id,
  defaultData,
  ref,
  contentType,
  ...props
}) => {
  const { value, errors, onValueChange, getValue, getState } =
    useFieldValues<string>({
      id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: defaultData as DefaultDataTypes<string>,
      defaultValue: '',
    })
  const { options } = useContentReferenceOptions(contentType)

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      <div className='flex gap-2'>
        {!props.isRequired && value && (
          <Button
            onClick={() => onValueChange('')}
            variant={'ghost'}
            size={'icon'}
          >
            <X />
          </Button>
        )}
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className='w-full'>
            <SelectValue
              placeholder={
                props.dynamicFallbackPlaceholder ?? `Select ${contentType.name}`
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{contentType.name}</SelectLabel>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FieldWrapper>
  )
}

export default ContentReferenceSelectUI
