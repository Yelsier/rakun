'use client'

import type { InitialConfigType } from '@lexical/react/LexicalComposer'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { cva } from 'class-variance-authority'
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical'
import { EditorRefPlugin } from '@lexical/react/LexicalEditorRefPlugin'

import { nodes } from './nodes'
import { Plugins } from './plugins'

import { editorTheme } from '@/components/editor/themes/editor-theme'
import { useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

const editorConfig: InitialConfigType = {
  namespace: 'Editor',
  theme: editorTheme,
  nodes: nodes as any,
  onError: (error: Error) => {
    console.error(error)
  },
}

const editorStyle = cva(
  'bg-background overflow-hidden rounded-lg border shadow',
  {
    variants: {
      open: {
        true: 'max-w-[calc(100vw-6.5em)] md:max-w-[calc(100vw-23em)]',
        false: 'md:max-w-[calc(100vw-6.5em)]',
      },
    },
  },
)

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  editorRef,
}: {
  editorState?: EditorState
  editorSerializedState?: SerializedEditorState
  onChange?: (editorState: EditorState) => void
  onSerializedChange?: (editorSerializedState: SerializedEditorState) => void
  editorRef?: React.RefObject<LexicalEditor | null>
}) {
  const { open } = useSidebar()

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
          <Plugins />
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
