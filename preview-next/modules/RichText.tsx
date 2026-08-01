import type { ReactNode } from 'react'

type LexicalNode = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  language?: string
  src?: string
  alt?: string
  mediaId?: string
  url?: string
  listType?: string
  children?: LexicalNode[]
}

type LexicalEditorState = {
  root?: {
    children?: LexicalNode[]
  }
}

const IS_BOLD = 1
const IS_ITALIC = 1 << 1
const IS_STRIKETHROUGH = 1 << 2
const IS_UNDERLINE = 1 << 3
const IS_CODE = 1 << 4

const asEditorState = (value: unknown): LexicalEditorState | null => {
  if (!value || typeof value !== 'object') return null
  const root = (value as { root?: unknown }).root
  if (!root || typeof root !== 'object') return null
  return value as LexicalEditorState
}

const unwrapTranslatable = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const record = value as Record<string, unknown>
  if (record._tag !== 'Translatable') return value
  if (typeof record.en !== 'undefined') return record.en
  const firstLocale = Object.entries(record).find(([key]) => key !== '_tag')
  return firstLocale?.[1]
}

const renderTextFormats = (node: LexicalNode, key: string): ReactNode => {
  const text = typeof node.text === 'string' ? node.text : ''
  if (!text) return null

  const format = typeof node.format === 'number' ? node.format : 0
  let content: ReactNode = text

  if (format & IS_CODE) {
    content = (
      <code key={`${key}-code`} className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.9em]">
        {content}
      </code>
    )
  }
  if (format & IS_BOLD) content = <strong key={`${key}-bold`}>{content}</strong>
  if (format & IS_ITALIC) content = <em key={`${key}-italic`}>{content}</em>
  if (format & IS_UNDERLINE) content = <u key={`${key}-underline`}>{content}</u>
  if (format & IS_STRIKETHROUGH) content = <s key={`${key}-strike`}>{content}</s>

  return <span key={key}>{content}</span>
}

const renderChildren = (nodes: LexicalNode[] | undefined, keyPrefix: string): ReactNode[] => {
  if (!nodes?.length) return []
  return nodes.map((node, index) => renderNode(node, `${keyPrefix}-${index}`))
}

const renderNode = (node: LexicalNode, key: string): ReactNode => {
  switch (node.type) {
    case 'text':
      return renderTextFormats(node, key)
    case 'linebreak':
      return <br key={key} />
    case 'link':
    case 'autolink':
      return (
        <a
          key={key}
          href={typeof node.url === 'string' ? node.url : '#'}
          className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
        >
          {renderChildren(node.children, key)}
        </a>
      )
    case 'paragraph':
      return (
        <p key={key} className="text-base leading-7 text-zinc-700">
          {renderChildren(node.children, key)}
        </p>
      )
    case 'heading': {
      const tag = node.tag === 'h1' || node.tag === 'h2' || node.tag === 'h3' ? node.tag : 'h2'
      const className =
        tag === 'h1'
          ? 'text-4xl font-semibold tracking-tight text-zinc-950'
          : tag === 'h2'
            ? 'text-3xl font-semibold tracking-tight text-zinc-950'
            : 'text-2xl font-semibold tracking-tight text-zinc-950'
      const HeadingTag = tag
      return (
        <HeadingTag key={key} className={className}>
          {renderChildren(node.children, key)}
        </HeadingTag>
      )
    }
    case 'quote':
      return (
        <blockquote
          key={key}
          className="border-l-4 border-emerald-600 pl-4 text-base leading-7 text-zinc-600 italic"
        >
          {renderChildren(node.children, key)}
        </blockquote>
      )
    case 'list': {
      const ordered = node.listType === 'number'
      const ListTag = ordered ? 'ol' : 'ul'
      return (
        <ListTag
          key={key}
          className={
            ordered
              ? 'list-decimal space-y-1 pl-6 text-base leading-7 text-zinc-700'
              : 'list-disc space-y-1 pl-6 text-base leading-7 text-zinc-700'
          }
        >
          {renderChildren(node.children, key)}
        </ListTag>
      )
    }
    case 'listitem':
      return <li key={key}>{renderChildren(node.children, key)}</li>
    case 'code':
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100"
        >
          <code data-language={node.language || undefined}>
            {renderChildren(node.children, key)}
          </code>
        </pre>
      )
    case 'code-highlight':
      return (
        <span key={key} className="font-mono">
          {typeof node.text === 'string' ? node.text : renderChildren(node.children, key)}
        </span>
      )
    case 'image': {
      const src = typeof node.src === 'string' ? node.src : ''
      if (!src) return null
      return (
        <img
          key={key}
          src={src}
          alt={typeof node.alt === 'string' ? node.alt : ''}
          className="my-4 h-auto w-full max-h-[480px] rounded-md object-contain"
        />
      )
    }
    default:
      if (node.children?.length) {
        return (
          <div key={key} className="space-y-3">
            {renderChildren(node.children, key)}
          </div>
        )
      }
      return null
  }
}

export default function RichText({
  value,
  className = 'space-y-4',
}: {
  value?: unknown
  className?: string
}) {
  const editorState = asEditorState(unwrapTranslatable(value))
  const children = editorState?.root?.children

  if (!children?.length) return null

  return <div className={className}>{renderChildren(children, 'rt')}</div>
}
