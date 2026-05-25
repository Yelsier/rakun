'use client'

import type { StringPropsRef } from '.'
import { useStringFieldValues } from '.'
import { errorStyle } from '../../edit.styles'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const PasswordUI: React.FC<StringPropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useStringFieldValues({
      id,
      ...props,
    })

  const error = errors.find((e) => e.id === id)?.error

  const ignoreIfSame = () => {
    const value = getValue()
    if (value === props.defaultData) {
      return undefined
    }
    return value
  }

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={ignoreIfSame}
      getState={getState}
      ref={ref}
    >
      <Input
        type='password'
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default PasswordUI
