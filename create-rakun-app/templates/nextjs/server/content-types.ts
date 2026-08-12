import { ContentType, f } from '@rakun-kit/core'

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

export const Page = new ContentType({
  name: 'Page',
  permissions: 'Page',
  menu: {
    title: 'Pages',
    icon: 'files',
    category: 'Content',
  },
  fields: {
    title: f.string().required(),
    slug: f.string().type('Slug').required(),
  },
  iterator: [
    {
      contentType: Hero,
      type: 'new',
    },
  ],
  uniques: [['slug']],
  listFields: ['title', 'slug'],
})
