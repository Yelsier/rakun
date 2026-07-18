'use client'

import { codeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'
import {
  RakunManagerClientPage,
  type RakunManagerClientPageProps,
} from '@rakun-kit/next/manager'

export const PreviewManager = (props: RakunManagerClientPageProps) => (
  <RakunManagerClientPage {...props} plugins={[codeEditorManagerPlugin]} />
)
