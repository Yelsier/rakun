'use client'

import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { cva } from 'class-variance-authority'
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'
import { useMemo } from 'react'

import { nodes } from './nodes'
import { Plugins } from './plugins'

import { editorTheme } from '@/components/editor/themes/editor-theme'
import { useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useManagerPlugins, type ManagerFieldEditorProps } from '@/plugins'

const editorStyle = cva('bg-background overflow-hidden rounded-lg border shadow', {
  variants: {
    open: {
      true: 'w-full',
      false: 'md:max-w-[calc(100vw-6.5em)]',
    },
  },
})

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  editorRef,
  placeholder = 'Start typing ...',
  pluginProps,
}: {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
  editorRef?: React.RefObject<LexicalEditor | null>
  placeholder?: string
  pluginProps: ManagerFieldEditorProps
}) {
  const { open } = useSidebar()
  const { richTextNodes, richTextPlugins } = useManagerPlugins()
  const editorConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: 'RakunRichText',
      theme: editorTheme,
      nodes: [...nodes, ...richTextNodes],
      onError: (error: Error) => {
        console.error(error)
      },
    }),
    [richTextNodes]
  )

  return (
    <div className={editorStyle({ open })}>
      <LexicalComposer
        initialConfig={
          {
            ...editorConfig,
            ...(editorState ? { editorState } : {}),
            ...(editorSerializedState
              ? { editorState: JSON.stringify(editorSerializedState) }
              : {}),
          } as any
        }
      >
        <TooltipProvider>
          <Plugins
            placeholder={placeholder}
            pluginProps={pluginProps}
            extensions={richTextPlugins}
          />
          {editorRef && <EditorRefPlugin editorRef={editorRef} />}
          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              onChange?.(editorState as any)
              onSerializedChange?.(editorState.toJSON())
            }}
          />
        </TooltipProvider>
      </LexicalComposer>
    </div>
  )
}
