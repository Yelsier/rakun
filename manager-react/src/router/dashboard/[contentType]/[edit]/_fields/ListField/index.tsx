import type { RefAttributes } from 'react'
import type { EncodedListField } from '@rakun-kit/core/client'
import type { EncodedSimpleListField } from '@rakun-kit/core/client'

import type { FieldRef } from '../../ContentTypeEdit'
import MissingUI from '../Missing'
import type { FieldValue } from '../shared'
import ListUI from './ListUI'
import SimpleListUI from './SimpleListUI'

export type ListProps = EncodedListField & {
  id: string
  defaultData?: FieldValue
}

export type ListPropsRef = ListProps & RefAttributes<FieldRef>

export type SimpleListProps = EncodedSimpleListField & {
  id: string
  defaultData?: FieldValue
}

export type SimpleListPropsRef = SimpleListProps & RefAttributes<FieldRef>

const ListField = (
  config: ListPropsRef | SimpleListPropsRef,
): React.ReactElement => {
  if (config.config.ui === 'SimpleList') {
    return <SimpleListUI {...(config as SimpleListPropsRef)} />
  }
  if (config.config.ui === 'List' || config.config.ui === 'Iterator') {
    return <ListUI {...(config as ListPropsRef)} />
  }

  return <MissingUI field={config.config} />
}
export default ListField
