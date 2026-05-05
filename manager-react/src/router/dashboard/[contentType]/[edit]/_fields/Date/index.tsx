import React, { type RefAttributes } from 'react'
import type { FieldUIType } from '@rakun-kit/core'
import type z from 'zod'
import type { EncodedDateField } from '@rakun-kit/core'

import type { FieldRef } from '../../ContentTypeEdit'
import DateTimeUI from './DateTimeUI'
import DateUI from './DateUI'
import TimeUI from './TimeUI'
import MissingUI from '../Missing'
import {
  FieldValue,
  isTranslatableData,
  useFieldValues,
  type DefaultDataTypes,
} from '../shared'

import { dateTimeToInputValue } from '@/helpers/dateToInputValue'

export type DateProps = EncodedDateField & {
  id: string
  defaultData?: FieldValue
}

export type DatePropsRef = DateProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<DatePropsRef>
} = {
  Date: DateUI,
  DateTime: DateTimeUI,
  Time: TimeUI,
}

const TransformDefaultData = (
  value: DefaultDataTypes<FieldValue>,
  type: 'Date' | 'DateTime' | 'Time',
): DefaultDataTypes<string> => {
  if (typeof value === 'string') {
    return value as DefaultDataTypes<string>
  }

  if (value instanceof Date) {
    return dateTimeToInputValue(value, type === 'DateTime')
  }

  if (isTranslatableData(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (val instanceof Date) {
          return [key, dateTimeToInputValue(val, type === 'DateTime')]
        }
        return [key, val]
      }),
    ) as DefaultDataTypes<string>
  }

  return ''
}

// Use the generic hook for string fields
export const useDateFieldValues = ({
  id,
  isRequired = false,
  isTranslatable = false,
  defaultData,
  type,
}: {
  id: string
  isRequired?: boolean
  isTranslatable?: boolean
  defaultData?: FieldValue
  type: 'Date' | 'DateTime' | 'Time'
}) => {
  return useFieldValues<string>({
    id,
    isRequired,
    isTranslatable,
    defaultData: TransformDefaultData(defaultData, type),
    defaultValue: '',
  })
}

const DateField = (config: DatePropsRef): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default DateField
