import type { EncodedContentType, EncodedMenuField } from '@rakun-kit/core/client'
import type { RefAttributes } from 'react'

import type { FieldRef } from '../../ContentTypeEdit'
import type { FieldValue } from '../shared'
import MenuUI from './MenuUI'

export type MenuProps = EncodedMenuField & {
  id: string
  defaultData?: FieldValue
  dynamicFallbackPlaceholder?: string
  parentContentType?: EncodedContentType
}

export type MenuPropsRef = MenuProps & RefAttributes<FieldRef>

const MenuField = (config: MenuPropsRef): React.ReactElement => <MenuUI {...config} />

export default MenuField
