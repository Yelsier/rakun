import { afterAll, describe, expect, it } from 'bun:test'
import { EditorView } from 'codemirror'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act, cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import {
  type ManagerFieldEditorRef,
} from '@rakun-kit/manager-react/plugins'
import type { LanguageSchema } from '@rakun-kit/core/client'
import { ManagerProvider } from '../../manager-react/src/client/react'
import { createManagerClient } from '../../manager-react/src/client/request'
import { LanguageProvider } from '../../manager-react/src/state/language'
import { ManagerThemeProvider } from '../../manager-react/src/state/theme'

import { CodeEditorField } from './manager'
import { codeField } from './server'

GlobalRegistrator.register()

afterAll(() => {
  cleanup()
  GlobalRegistrator.unregister()
})

const language = {
  _id: '000000000000000000000000',
  _type: 'Language',
  code: 'en',
  name: 'English',
  default: true,
} as LanguageSchema

describe('CodeEditorField', () => {
  it('mounts CodeMirror and exposes edited values through the manager ref', () => {
    const field = codeField({ language: 'typescript', minHeight: 180 })
    const ref = createRef<ManagerFieldEditorRef>()
    const client = createManagerClient(async () => [] as never)
    const encoded = {
      config: field.getConfig(),
      isRequired: field.getIsRequired(),
      isTranslatable: field.getIsTranslatable(),
      visibility: field.getVisibility(),
      isDynamic: field.getIsDynamic(),
      condition: field.getCondition(),
      defaultData: 'const first = true',
      id: 'snippet.source',
    }

    const result = render(
      <ManagerProvider client={client}>
        <ManagerThemeProvider>
          <LanguageProvider languages={[language]} initialLanguage={language}>
            <CodeEditorField {...(encoded as never)} ref={ref} />
          </LanguageProvider>
        </ManagerThemeProvider>
      </ManagerProvider>,
    )

    const editorElement = result.container.querySelector('.cm-editor')
    expect(editorElement).not.toBeNull()
    expect(ref.current?.getValue()).toBe('const first = true')

    const view = EditorView.findFromDOM(editorElement as HTMLElement)
    act(() => {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: 'const second = true',
        },
      })
    })

    expect(ref.current?.getValue()).toBe('const second = true')
  })
})
