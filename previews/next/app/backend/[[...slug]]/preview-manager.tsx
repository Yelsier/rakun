'use client'

import { createCodeEditorManagerPlugin } from '@rakun-kit/plugin-code-editor/manager'
import {
  RakunManagerClientPage,
  type RakunManagerClientPageProps,
} from '@rakun-kit/next/manager'

const codeEditorManagerPlugin = createCodeEditorManagerPlugin({
  languages: ['plaintext', 'json', 'javascript', 'typescript', 'html', 'css'],
})

export const PreviewManager = (props: RakunManagerClientPageProps) => (
  <RakunManagerClientPage {...props} plugins={[codeEditorManagerPlugin]} />
)
