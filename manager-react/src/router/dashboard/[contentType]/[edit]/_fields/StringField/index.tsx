import React, { type RefAttributes } from 'react'
import type z from 'zod'
import type { FieldUIType } from '@rakun-kit/core/lib/fields/Field'
import type { EncodedStringField } from '@rakun-kit/core/lib/fields/String'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import {
  DefaultProps,
  FieldValue,
  useFieldValues,
  type DefaultDataTypes,
} from '../shared'
import EmailUI from './EmailUI'
import PasswordUI from './PasswordUI'
import RichTextUI from './RichTextUI'
import SlugUI from './SlugUI'
import TextUI from './TextUI'
import TextareaUI from './TextareaUI'
import UrlUI from './UrlUi'

export type StringProps = EncodedStringField & DefaultProps

export type StringPropsRef = StringProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<StringPropsRef>
} = {
  Text: TextUI,
  Textarea: TextareaUI,
  Email: EmailUI,
  Slug: SlugUI,
  RichText: RichTextUI,
  Password: PasswordUI,
  Url: UrlUI,
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

const StringField = (config: StringPropsRef): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default StringField
