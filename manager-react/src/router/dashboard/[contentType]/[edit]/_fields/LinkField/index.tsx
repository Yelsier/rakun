import type { RefAttributes } from 'react'
import type { EncodedLinkField } from '@rakun-kit/core/client'
import type { FieldUIType } from '@rakun-kit/core/client'
import type z from 'zod'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import LinkUI from './LinkUI'
import { FieldValue } from '../shared'

export type LinkProps = EncodedLinkField & {
  id: string
  defaultData?: FieldValue
}

export type LinkPropsRef = LinkProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<LinkPropsRef>
} = {
  Link: LinkUI,
}

const LinkField = (config: LinkPropsRef): React.ReactElement => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default LinkField
