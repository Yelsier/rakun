import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin'
import { useState } from 'react'

import { ContentEditable } from '@/components/editor/editor-ui/content-editable'
import { ActionsPlugin } from '@/components/editor/plugins/actions/actions-plugin'
import { CounterCharacterPlugin } from '@/components/editor/plugins/actions/counter-character-plugin'
import { AutoLinkPlugin } from '@/components/editor/plugins/toolbar/auto-link-plugin'
import { BlockFormatDropDown } from '@/components/editor/plugins/toolbar/block-format-toolbar-plugin'
import { FormatBulletedList } from '@/components/editor/plugins/toolbar/block-format/format-bulleted-list'
import { FormatCheckList } from '@/components/editor/plugins/toolbar/block-format/format-check-list'
import { FormatHeading } from '@/components/editor/plugins/toolbar/block-format/format-heading'
import { FormatNumberedList } from '@/components/editor/plugins/toolbar/block-format/format-numbered-list'
import { FormatParagraph } from '@/components/editor/plugins/toolbar/block-format/format-paragraph'
import { FormatQuote } from '@/components/editor/plugins/toolbar/block-format/format-quote'
import { ClearFormattingToolbarPlugin } from '@/components/editor/plugins/toolbar/clear-formatting-toolbar-plugin'
import { ElementFormatToolbarPlugin } from '@/components/editor/plugins/toolbar/element-format-toolbar-plugin'
import { FloatingLinkEditorPlugin } from '@/components/editor/plugins/toolbar/floating-link-editor-plugin'
import { FontFormatToolbarPlugin } from '@/components/editor/plugins/toolbar/font-format-toolbar-plugin'
import { HistoryToolbarPlugin } from '@/components/editor/plugins/toolbar/history-toolbar-plugin'
import { LinkPlugin } from '@/components/editor/plugins/toolbar/link-plugin'
import { LinkToolbarPlugin } from '@/components/editor/plugins/toolbar/link-toolbar-plugin'
import { ToolbarPlugin } from '@/components/editor/plugins/toolbar/toolbar-plugin'
import { Separator } from '@/components/ui/separator'
import type {
  ManagerFieldEditorProps,
  ManagerRichTextPluginPlacement,
  ResolvedManagerRichTextPlugin,
} from '@/plugins'

const ExtensionPlugins = ({
  extensions,
  placement,
  pluginProps,
}: {
  extensions: readonly ResolvedManagerRichTextPlugin[]
  placement: ManagerRichTextPluginPlacement
  pluginProps: ManagerFieldEditorProps
}) =>
  extensions
    .filter((extension) => extension.placement === placement)
    .map((extension) => {
      const Component = extension.component
      return <Component key={extension.id} {...pluginProps} />
    })

export function Plugins({
  placeholder = 'Start typing ...',
  extensions,
  pluginProps,
}: {
  placeholder?: string
  extensions: readonly ResolvedManagerRichTextPlugin[]
  pluginProps: ManagerFieldEditorProps
}) {
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null)
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false)

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem)
    }
  }

  return (
    <div className="relative">
      {/* toolbar plugins */}
      <ToolbarPlugin>
        {({}) => (
          <div className="vertical-align-middle items-center sticky top-0 z-10 flex gap-2 overflow-auto border-b p-1">
            <HistoryToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <BlockFormatDropDown>
              <FormatParagraph />
              <FormatHeading levels={['h1', 'h2', 'h3']} />
              <FormatNumberedList />
              <FormatBulletedList />
              <FormatCheckList />
              <ExtensionPlugins
                extensions={extensions}
                placement="block-format"
                pluginProps={pluginProps}
              />
              <FormatQuote />
            </BlockFormatDropDown>
            <Separator orientation="vertical" className="!h-7" />
            <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
            <Separator orientation="vertical" className="!h-7" />
            <ClearFormattingToolbarPlugin />
            <Separator orientation="vertical" className="!h-7" />
            <FontFormatToolbarPlugin format="bold" />
            <FontFormatToolbarPlugin format="italic" />
            <FontFormatToolbarPlugin format="underline" />
            <FontFormatToolbarPlugin format="strikethrough" />
            <Separator orientation="vertical" className="!h-7" />
            <ElementFormatToolbarPlugin />
            <ExtensionPlugins
              extensions={extensions}
              placement="toolbar"
              pluginProps={pluginProps}
            />
          </div>
        )}
      </ToolbarPlugin>

      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <div className="">
              <div className="" ref={onRef}>
                <ContentEditable
                  placeholder={placeholder}
                  className="ContentEditable__root relative block min-h-72 overflow-auto px-8 py-4 focus:outline-none"
                />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        {/* editor plugins */}
        <TabIndentationPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <HistoryPlugin />
        <ClickableLinkPlugin />
        <AutoLinkPlugin />
        <LinkPlugin />
        <FloatingLinkEditorPlugin
          anchorElem={floatingAnchorElem}
          isLinkEditMode={isLinkEditMode}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <ExtensionPlugins
          extensions={extensions}
          placement="editor"
          pluginProps={pluginProps}
        />
      </div>
      {/* actions plugins */}
      <ActionsPlugin>
        <div className="clear-both flex items-center justify-between gap-2 overflow-auto border-t p-1">
          <div className="flex flex-1 justify-start">
            <ExtensionPlugins
              extensions={extensions}
              placement="actions-start"
              pluginProps={pluginProps}
            />
          </div>
          <div>
            <CounterCharacterPlugin charset="UTF-16" />
            {/* center action buttons */}
          </div>
          <div className="flex flex-1 justify-end">
            <ExtensionPlugins
              extensions={extensions}
              placement="actions-end"
              pluginProps={pluginProps}
            />
          </div>
        </div>
      </ActionsPlugin>
    </div>
  )
}
