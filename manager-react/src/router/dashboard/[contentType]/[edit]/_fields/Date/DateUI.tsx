'use client'

import { errorStyle } from '../../edit'
import { FieldWrapper } from '../shared/FieldWrapper'
import type { DatePropsRef } from '.'
import { useDateFieldValues } from '.'
import { DefaultDataTypes, isTranslatableData } from '../shared'

import { Input } from '@/components/ui/input'

const DateUI: React.FC<DatePropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useDateFieldValues({
      id,
      type: 'Date',
      ...props,
    })

  const error = errors.find((e) => e.id === id)?.error

  const valueToDate = () => {
    const value = getValue()

    if (!value) return value
    if (typeof value === 'object' && '_error' in value) return value

    if (isTranslatableData(value as DefaultDataTypes<unknown>)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, val]) => {
          if (!val) return [key, val]
          const date = new Date(val)
          return [key, isNaN(date.getTime()) ? val : date]
        }),
      ) as typeof value
    }

    if (!value) return value
    const date = new Date(value as string)
    return isNaN(date.getTime()) ? value : date
  }

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={valueToDate}
      getState={getState}
      ref={ref}
    >
      <Input
        type='date'
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default DateUI
