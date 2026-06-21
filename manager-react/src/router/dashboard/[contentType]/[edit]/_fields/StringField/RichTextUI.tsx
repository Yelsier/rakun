'use client'

import { LexicalEditor, type SerializedEditorState } from 'lexical'
import { useEffect, useRef } from 'react'

import type { StringPropsRef } from '.'
import { useFieldValues, type DefaultDataTypes } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Editor } from '@/components/blocks/editor-00/editor'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

const EmptyValue = {
  root: {
    children: [
      {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
} as unknown as SerializedEditorState

const isSerializedEditorState = (
  value: unknown,
): value is SerializedEditorState => {
  if (!value || typeof value !== 'object') return false

  const root = (value as { root?: unknown }).root
  if (!root || typeof root !== 'object') return false

  const children = (root as { children?: unknown }).children
  const type = (root as { type?: unknown }).type

  return (
    type === 'root' &&
    Array.isArray(children) &&
    children.length > 0 &&
    children.every(isSerializedLexicalNode)
  )
}

const isSerializedLexicalNode = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false

  const type = (value as { type?: unknown }).type
  const children = (value as { children?: unknown }).children

  if (typeof type !== 'string') return false
  if (children === undefined) return true

  return Array.isArray(children) && children.every(isSerializedLexicalNode)
}

const normalizeEditorState = (value: unknown): SerializedEditorState => {
  return isSerializedEditorState(value) ? value : EmptyValue
}

const RichTextUI: React.FC<StringPropsRef> = ({
  id,
  isTranslatable,
  defaultData,
  ref,
  ...props
}) => {
  const {
    errors,
    cleanErrors,
    value,
    translatesStore,
    getState,
    onValueChange,
    getValue,
  } = useFieldValues<SerializedEditorState>({
    id,
    isRequired: props.isRequired,
    isTranslatable,
    defaultData: defaultData as DefaultDataTypes<SerializedEditorState>,
    defaultValue: EmptyValue as unknown as SerializedEditorState,
  })

  const { language } = useLanguage()
  const editorRef = useRef<LexicalEditor>(null)
  const editorValue = normalizeEditorState(value)

  useEffect(() => {
    if (!isTranslatable) return

    editorRef.current?.update(() => {
      // get from store serialized state of the current language and set it to the editor
      const state = normalizeEditorState(translatesStore[language.code])
      editorRef.current?.setEditorState(editorRef.current.parseEditorState(state))
    })
  }, [isTranslatable, language.code])

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getState={getState}
      getValue={getValue}
      ref={ref}
    >
      <Editor
        editorRef={editorRef}
        editorSerializedState={editorValue}
        placeholder={props.dynamicFallbackPlaceholder ?? 'Start typing ...'}
        onSerializedChange={(value) => {
          onValueChange(value)
          cleanErrors()
        }}
      />
    </FieldWrapper>
  )
}

export default RichTextUI
