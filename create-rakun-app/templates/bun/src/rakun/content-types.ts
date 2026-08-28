import { ContentType, f } from '@rakun-kit/core'
import type { DataFront } from '@rakun-kit/core/types'

export const Hero = new ContentType({
  name: 'Hero',
  menu: {
    title: 'Hero',
    icon: 'sparkles',
    category: 'Modules',
  },
  fields: {
    heading: f.string().required(),
    text: f.string().type('Textarea').optional(),
  },
  listFields: ['heading'],
})

export const Counter = new ContentType({
  name: 'Counter',
  fields: {
    initial: f.number().optional(),
  },
})

export const Page = new ContentType({
  name: 'Page',
  permissions: 'Page',
  menu: {
    title: 'Pages',
    icon: 'files',
    category: 'Content',
  },
  fields: {
    title: f.string().translatable().required(),
    slug: f.string().type('Slug').translatable().required(),
  },
  iterator: [
    { contentType: Hero, type: 'existing' },
    { contentType: Counter, type: 'new' },
  ],
  listFields: ['title', 'slug'],
  uniques: [['slug']],
})

export const keyedContentTypes = { Counter, Hero, Page }

export type Props<T extends keyof typeof keyedContentTypes> = DataFront<
  (typeof keyedContentTypes)[T]
>
