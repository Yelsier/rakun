import ContentType from '../src/lib/ContentType'
import { f, type Breadcrumb } from '../src/lib/fields'
import type { DataFront, DataInput, DBOutput } from '../src/lib/types'

const Hero = new ContentType({
  name: 'TypedBreadcrumsHero',
  fields: {
    breadcrums: f.breadcrums(),
  },
})

const breadcrumb: Breadcrumb = {
  label: 'About',
  href: '/about/',
}

const _frontWithItems: DataFront<typeof Hero> = {
  _id: 'hero',
  _type: 'TypedBreadcrumsHero',
  breadcrums: [breadcrumb],
}

const _frontWithoutRoute: DataFront<typeof Hero> = {
  _id: 'hero',
  _type: 'TypedBreadcrumsHero',
  breadcrums: null,
}

const _input: DataInput<typeof Hero> = {
  _type: 'TypedBreadcrumsHero',
}

const _db: DBOutput<typeof Hero> = {
  _id: 'hero',
  _type: 'TypedBreadcrumsHero',
}

const _invalidInput: DataInput<typeof Hero> = {
  _type: 'TypedBreadcrumsHero',
  // @ts-expect-error Computed breadcrums are not accepted in input.
  breadcrums: null,
}

const _invalidDb: DBOutput<typeof Hero> = {
  _id: 'hero',
  _type: 'TypedBreadcrumsHero',
  // @ts-expect-error Computed breadcrums are not persisted.
  breadcrums: null,
}
