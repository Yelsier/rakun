import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import { HelloWorld } from './HelloWorld'
import { Seo } from './Seo'

export const Page = new ContentType({
  name: 'Page',
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type('Slug').required().translatable(),
    iterator: Fields.iterator([
      {
        contentType: HelloWorld,
        type: 'new',
      },
    ]).required(),
    seo: Fields.relation(Seo, "new").required(),
  },
  menu: {
    title: 'Pages',
  },
  listFields: ['title', 'slug'],
  uniques: [['slug']],
  versioning: {
    maxVersions: 5,
  },
})

export type Page = typeof Page
