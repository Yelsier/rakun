import type { DataFront } from '@rakun-kit/core/types'
import { ContentType, f } from '@rakun-kit/core'

export const PageSection = new ContentType({
  name: 'PageSection',
  menu: {
    title: 'previewBun.contentTypes.pageSection.menu',
    icon: 'LayoutTemplate',
    category: 'previewBun.contentTypes.category',
  },
  fields: {
    title: f.string().required(),
    body: f.string().type('Textarea').optional(),
  },
  listFields: ['title'],
})

export const Counter = new ContentType({
  name: 'Counter',
  fields: {
    initial: f.number().optional(),
  },
})

export const LinkSection = new ContentType({
  name: 'LinkSection',
  fields: {
    label: f.string().required(),
    link: f.link().required(),
  },
})

export const Page = new ContentType({
  name: 'Page',
  permissions: 'Page',
  menu: {
    title: 'previewBun.contentTypes.page.menu',
    icon: 'FileText',
    category: 'previewBun.contentTypes.category',
  },
  fields: {
    title: f.string().translatable().required(),
    slug: f.string().type('Slug').translatable().required(),
  },
  iterator: [
    { contentType: PageSection, type: 'existing' },
    { contentType: Counter, type: 'new' },
    { contentType: LinkSection, type: 'new' },
  ],
  listFields: ['title', 'slug'],
  uniques: [['slug']],
})

export const keyedContentTypes = {
  Counter,
  LinkSection,
  Page,
  PageSection,
}

export type Props<T extends keyof typeof keyedContentTypes> = DataFront<
  (typeof keyedContentTypes)[T]
>
