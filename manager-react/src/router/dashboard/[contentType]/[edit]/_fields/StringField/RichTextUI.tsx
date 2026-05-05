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

  useEffect(() => {
    if (!isTranslatable) return

    editorRef.current?.update(() => {
      // get from store serialized state of the current language and set it to the editor
      const state = translatesStore[language.code] || EmptyValue
      if (state) {
        editorRef.current?.setEditorState(
          editorRef.current?.parseEditorState(state),
        )
      }
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
        editorSerializedState={value}
        onSerializedChange={(value) => {
          onValueChange(value)
          cleanErrors()
        }}
      />
    </FieldWrapper>
  )
}

export default RichTextUI
