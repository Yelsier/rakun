'use client'

import React from 'react'

import type { NumberPropsRef } from '.'
import { useNumberFieldValues } from '.'
import { errorStyle } from '../../edit'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Input } from '@/components/ui/input'

const NumberUI: React.FC<NumberPropsRef> = ({ ref, id, ...props }) => {
  const { value, errors, onValueChange, translatesStore, getState } =
    useNumberFieldValues({
      id,
      ...props,
    })

  const error = errors.find((e) => e.id === id)?.error

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={() => (props.isTranslatable ? translatesStore : value)}
      getState={getState}
      ref={ref}
    >
      <Input
        type='number'
        required={props.isRequired}
        value={value}
        min={props.minValue}
        max={props.maxValue}
        className={errorStyle({ error: !!error })}
        onChange={(e) =>
          onValueChange(
            Math.max(
              props.minValue || -Infinity,
              Math.min(props.maxValue || Infinity, Number(e.target.value)),
            ),
          )
        }
      />
    </FieldWrapper>
  )
}

export default NumberUI
