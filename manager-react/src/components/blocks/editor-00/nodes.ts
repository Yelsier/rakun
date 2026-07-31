import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ParagraphNode, TextNode } from 'lexical'

import { ImageNode } from '@/components/editor/nodes/ImageNode'

export const nodes = [
  HeadingNode,
  ParagraphNode,
  TextNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  ImageNode,
]
