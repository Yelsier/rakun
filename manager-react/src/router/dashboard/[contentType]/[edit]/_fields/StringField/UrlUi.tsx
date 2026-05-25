'use client'

import z from 'zod'

import type { StringPropsRef } from '.'
import { useStringFieldValues } from '.'
import { errorStyle } from '../../edit.styles'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const UrlUI: React.FC<StringPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
      validateValue: (value) => {
        if (z.url().or(z.literal('')).safeParse(value).success === false) {
          return 'Invalid url address'
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
        type='url'
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default UrlUI
