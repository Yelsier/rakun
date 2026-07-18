'use client'

import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { basicSetup, EditorView } from 'codemirror'
import {
  defineRakunManagerPlugin,
  useManagerFieldValue,
  type ManagerFieldEditorProps,
  type ManagerFieldEditorRef,
} from '@rakun-kit/manager-react/plugins'
import { useManagerTheme } from '@rakun-kit/manager-react/state/theme'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import {
  CODE_EDITOR_FIELD_ID,
  CODE_EDITOR_PLUGIN_ID,
  type CodeLanguage,
} from './shared'

const getLanguageExtension = (language: CodeLanguage) => {
  if (language === 'json') return json()
  if (language === 'javascript') return javascript()
  if (language === 'typescript') return javascript({ typescript: true })
  if (language === 'html') return html()
  if (language === 'css') return css()
  return []
}

const CodeEditorField = forwardRef<
  ManagerFieldEditorRef,
  ManagerFieldEditorProps
>((props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { resolvedTheme } = useManagerTheme()
  const { value, errors, onValueChange, getValue, getState } =
    useManagerFieldValue<string>({
      id: props.id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: props.defaultData as never,
      defaultValue: '',
    })
  const language = (props.config.language ?? 'text') as CodeLanguage
  const minHeight =
    typeof props.config.minHeight === 'number' ? props.config.minHeight : 240

  useImperativeHandle(ref, () => ({ getValue, getState }), [getState, getValue])

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      parent: containerRef.current,
      doc: value,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        EditorView.lineWrapping,
        EditorView.theme(
          {
            '&': {
              minHeight: `${minHeight}px`,
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              fontSize: '0.875rem',
            },
            '.cm-scroller': { minHeight: `${minHeight}px` },
            '.cm-gutters': {
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
              borderColor: 'var(--border)',
            },
            '&.cm-focused': { outline: 'none' },
          },
          { dark: resolvedTheme === 'dark' },
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onValueChange(update.state.doc.toString())
        }),
      ],
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [language, minHeight, resolvedTheme])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    })
  }, [value])

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring"
        data-code-language={language}
      />
      {props.dynamicFallbackPlaceholder ? (
        <p className="text-xs text-muted-foreground">
          {props.dynamicFallbackPlaceholder}
        </p>
      ) : null}
      {errors.map((error) => (
        <p key={error.id} className="text-sm text-destructive">
          {error.error}
        </p>
      ))}
    </div>
  )
})

CodeEditorField.displayName = 'CodeEditorField'

export const codeEditorManagerPlugin = defineRakunManagerPlugin({
  id: CODE_EDITOR_PLUGIN_ID,
  fieldEditors: {
    [CODE_EDITOR_FIELD_ID]: CodeEditorField,
  },
})

export { CodeEditorField }
