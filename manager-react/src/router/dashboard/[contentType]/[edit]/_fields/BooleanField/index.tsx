import React, { type RefAttributes } from 'react'
import type { FieldUIType } from '@rakun-kit/core/lib/fields/Field'
import type { z } from 'zod'
import type { EncodedBooleanField } from '@rakun-kit/core/lib/fields/Boolean'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import { DefaultDataTypes, FieldValue, useFieldValues } from '../shared'
import BooleanUI from './BooleanUI'

export type BooleanProps = EncodedBooleanField & {
  id: string
  defaultData?: FieldValue
}

export type BooleanPropsRef = BooleanProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<BooleanPropsRef>
} = {
  Boolean: BooleanUI,
}

export const useBooleanFieldValues = ({
  id = '',
  isTranslatable = false,
  defaultData,
}: {
  id?: string
  isTranslatable?: boolean
  defaultData?: FieldValue
}) => {
  return useFieldValues<boolean>({
    id,
    isRequired: false, // Boolean fields are typically not required since false is a valid value
    isTranslatable,
    defaultData: defaultData as DefaultDataTypes<boolean>,
    defaultValue: false,
  })
}

const BooleanInput = (config: BooleanProps): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default BooleanInput
