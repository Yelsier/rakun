'use client'

import { slugify } from '@rakun/core/lib/utils/slugify'
import z from 'zod'

import type { StringPropsRef } from '.'
import { useStringFieldValues } from '.'
import { errorStyle } from '../../edit'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const SlugUI: React.FC<StringPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
      validateValue: (value) => {
        if (
          z
            .string()
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .or(z.literal(''))
            .safeParse(value).success === false
        ) {
          return 'Invalid slug'
        }
        return null
      },
    })

  const error = errors.find((e) => e.id === id)?.error

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      <Input
        type='text'
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(slugify(e.target.value))}
      />
    </FieldWrapper>
  )
}

SlugUI.displayName = 'SlugUI'
export default SlugUI
