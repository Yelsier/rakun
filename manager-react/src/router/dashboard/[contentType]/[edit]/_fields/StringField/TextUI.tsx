'use client'

import type { StringPropsRef } from '.'
import { useStringFieldValues } from '.'
import { errorStyle } from '../../edit.styles'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const TextUI: React.FC<StringPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
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
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default TextUI
