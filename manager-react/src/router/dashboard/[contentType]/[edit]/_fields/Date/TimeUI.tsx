'use client'

import React from 'react'

import type { DatePropsRef } from '.'
import { useDateFieldValues } from '.'
import { errorStyle } from '../../edit.styles'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const TimeUI: React.FC<DatePropsRef> = ({ id, ref, ...props }) => {
  const { value, errors, onValueChange, getValue, getState } =
    useDateFieldValues({
      id,
      type: 'Time',
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
        type='time'
        step={2}
        required={props.isRequired}
        value={value}
        className={errorStyle({ error: !!error })}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </FieldWrapper>
  )
}

export default TimeUI
