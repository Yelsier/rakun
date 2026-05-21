import type { RefAttributes } from 'react'
import type z from 'zod'
import type { FieldUIType } from '@rakun-kit/core/client'
import type { EncodedRelationField } from '@rakun-kit/core/client'
import type { EncodedContentType } from '@rakun-kit/core/client'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import ContentTypeUI from './ContentTypeUI'
import SelfRelationUI from './SelfRelationUI'
import { DefaultProps } from '../shared'

export type RelationProps = EncodedRelationField &
  DefaultProps & {
    collapsible?: boolean
    parentContentType?: EncodedContentType
  }

export type RelationPropsRef = RelationProps & RefAttributes<FieldRef>

const typeMap: {
  [key in z.infer<typeof FieldUIType>]?: React.FC<RelationPropsRef>
} = {
  ContentType: ContentTypeUI,
  SelfRelation: SelfRelationUI,
}

const RelationField = (config: RelationPropsRef) => {
  const FieldComponent = typeMap[config.config.ui]

  if (!FieldComponent) {
    return <MissingUI field={config.config} />
  }

  return <FieldComponent {...config} />
}
export default RelationField
