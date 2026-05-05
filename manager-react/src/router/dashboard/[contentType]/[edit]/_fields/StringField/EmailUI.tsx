'use client'

import z from 'zod'

import { useStringFieldValues, type StringPropsRef } from '.'
import { errorStyle } from '../../edit'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const EmailUI: React.FC<StringPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
      validateValue: (value) => {
        if (z.email().or(z.literal('')).safeParse(value).success === false) {
          return 'Invalid email address'
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
        type='email'
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default EmailUI
