import React, { type RefAttributes } from 'react'
import type z from 'zod'
import type { FieldUIType } from '@rakun-kit/core'
import type { EncodedNumberField } from '@rakun-kit/core'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import {
  DefaultDataTypes,
  DefaultProps,
  FieldValue,
  useFieldValues,
} from '../shared'
import NumberUI from './NumberUI'

export type NumberProps = EncodedNumberField & DefaultProps

export type NumberPropsRef = NumberProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<NumberPropsRef>
} = {
  Number: NumberUI,
}

export const useNumberFieldValues = ({
  id,
  isRequired = false,
  isTranslatable = false,
  defaultData,
}: {
  id: string
  isRequired?: boolean
  isTranslatable?: boolean
  defaultData?: FieldValue
}) => {
  return useFieldValues<number>({
    id,
    isRequired,
    isTranslatable,
    defaultData: defaultData as DefaultDataTypes<number>,
    defaultValue: 0,
  })
}

const NumberField = (config: NumberPropsRef): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default NumberField
