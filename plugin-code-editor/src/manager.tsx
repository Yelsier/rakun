'use client'

import {
  $createCodeNode,
  $isCodeNode,
  CodeHighlightNode,
  CodeNode,
  getCodeLanguageOptions,
  getLanguageFriendlyName,
  normalizeCodeLanguage,
  registerCodeHighlighting,
} from '@lexical/code'
import 'prismjs/components/prism-json.js'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $setBlocksType } from '@lexical/selection'
import {
  defineRakunManagerPlugin,
  type ManagerRichTextPluginProps,
} from '@rakun-kit/manager-react/plugins'
import { ManagerRichTextBlockFormatItem } from '@rakun-kit/manager-react/rich-text'
import {
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  type LexicalNode,
} from 'lexical'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'

import {
  CODE_ACTIONS_ID,
  CODE_BLOCK_FORMAT_ID,
  CODE_EDITOR_PLUGIN_ID,
  CODE_HIGHLIGHT_ID,
  CODE_LANGUAGE_ID,
} from './shared'

export const CODE_EDITOR_LANGUAGES = [
  'c',
  'clike',
  'cpp',
  'css',
  'html',
  'java',
  'js',
  'json',
  'markdown',
  'objc',
  'plain',
  'powershell',
  'py',
  'rust',
  'sql',
  'swift',
  'typescript',
  'xml',
] as const

export const CODE_EDITOR_LANGUAGE_ALIASES = [
  'javascript',
  'md',
  'plaintext',
  'python',
  'text',
  'ts',
] as const

export type CodeEditorLanguage =
  | (typeof CODE_EDITOR_LANGUAGES)[number]
  | (typeof CODE_EDITOR_LANGUAGE_ALIASES)[number]

export type CodeEditorManagerPluginOptions = {
  languages?: readonly CodeEditorLanguage[]
}

type CodeLanguageOption = readonly [value: string, label: string]

const getAvailableCodeLanguageOptions = (): readonly CodeLanguageOption[] => {
  const options = getCodeLanguageOptions()
  const javaIndex = options.findIndex(([language]) => language === 'java')
  options.splice(javaIndex + 1, 0, ['json', 'JSON'])
  return options
}

const resolveCodeLanguageOptions = (
  languages?: readonly CodeEditorLanguage[],
): readonly CodeLanguageOption[] => {
  const availableOptions = getAvailableCodeLanguageOptions()
  if (languages === undefined) return availableOptions
  if (languages.length === 0) {
    throw new Error('Code editor plugin languages must not be empty')
  }

  const availableByValue = new Map(availableOptions)
  const seen = new Set<string>()

  return languages.map((language) => {
    const normalizedLanguage = normalizeCodeLanguage(language)
    const label = availableByValue.get(normalizedLanguage)
    if (!label) {
      throw new Error(
        `Unsupported code editor language "${language}". Supported languages: ${CODE_EDITOR_LANGUAGES.join(', ')}`,
      )
    }
    if (seen.has(normalizedLanguage)) {
      throw new Error(`Duplicate code editor language "${language}"`)
    }
    seen.add(normalizedLanguage)
    return [normalizedLanguage, label] as const
  })
}

const $getSelectedCodeNode = (): CodeNode | null => {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return null

  let node: LexicalNode | null = selection.anchor.getNode()
  while (node && !$isCodeNode(node)) node = node.getParent()

  return $isCodeNode(node) ? node : null
}

export function FormatCodeBlock(_props: ManagerRichTextPluginProps) {
  const [editor] = useLexicalComposerContext()

  const formatCode = () => {
    editor.update(() => {
      let selection = $getSelection()
      if (!$isRangeSelection(selection)) return

      if (selection.isCollapsed()) {
        $setBlocksType(selection, () => $createCodeNode())
        return
      }

      const textContent = selection.getTextContent()
      const codeNode = $createCodeNode()
      selection.insertNodes([codeNode])
      selection = $getSelection()
      if ($isRangeSelection(selection)) selection.insertRawText(textContent)
    })
  }

  return (
    <ManagerRichTextBlockFormatItem value="code" onPointerDown={formatCode}>
      <span aria-hidden="true" className="font-mono text-xs">
        {'</>'}
      </span>
      <span>Code Block</span>
    </ManagerRichTextBlockFormatItem>
  )
}

export function CodeHighlightPlugin(_props: ManagerRichTextPluginProps) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => registerCodeHighlighting(editor), [editor])

  return null
}

export function CodeLanguageToolbarPlugin({
  languageOptions = getAvailableCodeLanguageOptions(),
}: ManagerRichTextPluginProps & {
  languageOptions?: readonly CodeLanguageOption[]
}) {
  const [editor] = useLexicalComposerContext()
  const [selectedElementKey, setSelectedElementKey] = useState<string | null>(
    null,
  )
  const [language, setLanguage] = useState('')

  const updateSelection = useCallback(() => {
    const codeNode = $getSelectedCodeNode()
    setSelectedElementKey(codeNode?.getKey() ?? null)
    setLanguage(codeNode?.getLanguage() ?? '')
  }, [])

  useEffect(() => {
    editor.getEditorState().read(updateSelection)
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(updateSelection)
    })
  }, [editor, updateSelection])

  const onLanguageChange = (nextLanguage: string) => {
    editor.update(() => {
      if (!selectedElementKey) return
      const node = $getNodeByKey(selectedElementKey)
      if ($isCodeNode(node)) node.setLanguage(nextLanguage)
    })
  }

  if (!selectedElementKey) return null

  const visibleLanguageOptions =
    language && !languageOptions.some(([value]) => value === language)
      ? ([[language, getLanguageFriendlyName(language)], ...languageOptions] as const)
      : languageOptions

  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      <span>Language</span>
      <select
        aria-label="Code language"
        value={language}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => onLanguageChange(event.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      >
        {visibleLanguageOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

type CodeActionTarget = {
  element: HTMLElement
  language: string
  top: number
  right: number
}

const getCodeActionTarget = (
  editorRoot: HTMLElement,
  eventTarget: EventTarget | null,
): CodeActionTarget | null => {
  if (!(eventTarget instanceof HTMLElement)) return null

  const element = eventTarget.closest<HTMLElement>('code.EditorTheme__code')
  if (!element || !editorRoot.contains(element)) return null

  const rect = element.getBoundingClientRect()
  return {
    element,
    language: element.dataset.language ?? '',
    top: rect.top + 8,
    right: window.innerWidth - rect.right + 8,
  }
}

const codeActionsStyle: CSSProperties = {
  alignItems: 'center',
  background: 'var(--background)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px rgb(0 0 0 / 0.12)',
  display: 'flex',
  gap: '0.5rem',
  padding: '0.25rem 0.375rem',
  position: 'fixed',
  zIndex: 60,
}

export function CodeActionsPlugin(_props: ManagerRichTextPluginProps) {
  const [editor] = useLexicalComposerContext()
  const [target, setTarget] = useState<CodeActionTarget | null>(null)
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const editorRoot = editor.getRootElement()
    if (!editorRoot) return

    const onMouseMove = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-rakun-code-actions]')
      ) {
        return
      }
      const nextTarget = getCodeActionTarget(editorRoot, event.target)
      setTarget((currentTarget) =>
        currentTarget?.element === nextTarget?.element
          ? currentTarget
          : nextTarget,
      )
    }
    const hide = () => setTarget(null)

    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', hide)
    window.addEventListener('scroll', hide, true)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', hide)
      window.removeEventListener('scroll', hide, true)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    }
  }, [editor])

  const copyCode = async () => {
    if (!target || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(target.element.textContent ?? '')
    } catch {
      return
    }
    setCopied(true)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500)
  }

  if (!target || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-rakun-code-actions
      style={{ ...codeActionsStyle, top: target.top, right: target.right }}
    >
      <span className="text-xs text-muted-foreground">
        {target.language
          ? getLanguageFriendlyName(target.language)
          : 'Plain Text'}
      </span>
      <button
        type="button"
        className="rounded px-2 py-1 text-xs font-medium hover:bg-accent"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => void copyCode()}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>,
    document.body,
  )
}

export const createCodeEditorManagerPlugin = ({
  languages,
}: CodeEditorManagerPluginOptions = {}) => {
  const languageOptions = resolveCodeLanguageOptions(languages)
  const ConfiguredCodeLanguageToolbarPlugin = (
    props: ManagerRichTextPluginProps,
  ) => (
    <CodeLanguageToolbarPlugin
      {...props}
      languageOptions={languageOptions}
    />
  )

  return defineRakunManagerPlugin({
    id: CODE_EDITOR_PLUGIN_ID,
    richText: {
      nodes: [CodeNode, CodeHighlightNode],
      plugins: [
        {
          id: CODE_BLOCK_FORMAT_ID,
          component: FormatCodeBlock,
          placement: 'block-format',
        },
        {
          id: CODE_LANGUAGE_ID,
          component: ConfiguredCodeLanguageToolbarPlugin,
          placement: 'toolbar',
        },
        {
          id: CODE_HIGHLIGHT_ID,
          component: CodeHighlightPlugin,
          placement: 'editor',
        },
        {
          id: CODE_ACTIONS_ID,
          component: CodeActionsPlugin,
          placement: 'editor',
        },
      ],
    },
  })
}

export const codeEditorManagerPlugin = createCodeEditorManagerPlugin()

export const codeBlocksManagerPlugin = codeEditorManagerPlugin

export {
  CODE_ACTIONS_ID,
  CODE_BLOCK_FORMAT_ID,
  CODE_EDITOR_PLUGIN_ID,
  CODE_HIGHLIGHT_ID,
  CODE_LANGUAGE_ID,
} from './shared'
