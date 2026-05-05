'use client'

import { X } from 'lucide-react'

import { useStringFieldValues } from '../StringField'
import { FieldWrapper } from '../shared/FieldWrapper'
import type { SelectPropsRef } from '.'

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

const SelectUI: React.FC<SelectPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
    })

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
            <SelectValue placeholder='Select an option' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Options</SelectLabel>
              {props.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </FieldWrapper>
  )
}

export default SelectUI
