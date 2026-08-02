import React, { type RefAttributes } from 'react'
import type { FieldUIType } from '@rakun-kit/core/client'
import type z from 'zod'
import type { EncodedDateField } from '@rakun-kit/core/client'

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
  dynamicFallbackPlaceholder?: string
}

export type DatePropsRef = DateProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<DatePropsRef>
} = {
  Date: DateUI,
  DateTime: DateTimeUI,
  Time: TimeUI,
}

export const transformDateDefaultData = (
  value: DefaultDataTypes<FieldValue>,
  type: 'Date' | 'DateTime' | 'Time',
): DefaultDataTypes<string> => {
  if (typeof value === 'string') {
    return type === 'Time'
      ? value
      : dateTimeToInputValue(value, type === 'DateTime')
  }

  if (value instanceof Date) {
    return type === 'Time'
      ? ''
      : dateTimeToInputValue(value, type === 'DateTime')
  }

  if (isTranslatableData(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        if (key === '_tag') return [key, val]
        if (type !== 'Time' && (typeof val === 'string' || val instanceof Date)) {
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
  dateType,
}: {
  id: string
  isRequired?: boolean
  isTranslatable?: boolean
  defaultData?: FieldValue
  dateType: 'Date' | 'DateTime' | 'Time'
}) => {
  return useFieldValues<string>({
    id,
    isRequired,
    isTranslatable,
    defaultData: transformDateDefaultData(defaultData, dateType),
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
