import React, { type RefAttributes } from 'react'
import type z from 'zod'
import type { FieldUIType } from '@rakun-kit/core/lib/fields/Field'
import type { EncodedSelectField } from '@rakun-kit/core/lib/fields/Select'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import {
  DefaultProps,
  FieldValue,
  useFieldValues,
  type DefaultDataTypes,
} from '../shared'
import SelectUI from './SelectUI'
import MultiSelectUI from './MultiSelectUI'

export type SelectProps = EncodedSelectField & DefaultProps

export type SelectPropsRef = SelectProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<SelectPropsRef>
} = {
  Select: SelectUI,
  MultiSelect: MultiSelectUI,
}

// Use the generic hook for string fields
export const useStringFieldValues = ({
  id,
  isRequired = false,
  isTranslatable = false,
  defaultData,
  validateValue,
}: {
  id: string
  isRequired?: boolean
  isTranslatable?: boolean
  defaultData?: FieldValue
  validateValue?: (value: string) => string | null
}) => {
  return useFieldValues<string>({
    id,
    isRequired,
    isTranslatable,
    defaultData: defaultData as DefaultDataTypes<string>,
    defaultValue: '',
    validateValue,
  })
}

const SelectField = (config: SelectPropsRef): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default SelectField
