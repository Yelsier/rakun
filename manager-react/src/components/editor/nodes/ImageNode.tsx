'use client'

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, DecoratorNode } from 'lexical'
import type { JSX } from 'react'

export type ImagePayload = {
  src: string
  alt?: string
  mediaId?: string
  key?: NodeKey
}

export type SerializedImageNode = Spread<
  {
    src: string
    alt: string
    mediaId?: string
  },
  SerializedLexicalNode
>

const $convertImageElement = (domNode: Node): DOMConversionOutput | null => {
  if (!(domNode instanceof HTMLImageElement)) return null
  const { alt, src } = domNode
  if (!src) return null
  return { node: $createImageNode({ src, alt: alt || undefined }) }
}

function ImageComponent({
  src,
  alt,
}: {
  src: string
  alt: string
}) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className='my-4 max-h-[480px] max-w-full rounded-md object-contain'
    />
  )
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __alt: string
  __mediaId?: string

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__mediaId, node.__key)
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      alt: serializedNode.alt,
      mediaId: serializedNode.mediaId,
    })
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: $convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(src: string, alt = '', mediaId?: string, key?: NodeKey) {
    super(key)
    this.__src = src
    this.__alt = alt
    this.__mediaId = mediaId
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt,
      ...(this.__mediaId ? { mediaId: this.__mediaId } : {}),
    }
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__alt)
    if (this.__mediaId) {
      element.setAttribute('data-media-id', this.__mediaId)
    }
    return { element }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const className = config.theme.image
    if (typeof className === 'string') {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAlt(): string {
    return this.__alt
  }

  getMediaId(): string | undefined {
    return this.__mediaId
  }

  setAlt(alt: string): void {
    const writable = this.getWritable()
    writable.__alt = alt
  }

  decorate(): JSX.Element {
    return <ImageComponent src={this.__src} alt={this.__alt} />
  }

  isInline(): boolean {
    return false
  }
}

export function $createImageNode({
  src,
  alt = '',
  mediaId,
  key,
}: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt, mediaId, key))
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode
}
