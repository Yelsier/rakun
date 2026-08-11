import ContentType from '../src/lib/ContentType'
import { f } from '../src/lib/fields'
import type { DataFront, DataInput, DBOutput } from '../src/lib/types'

const LinkPage = new ContentType({
  name: 'TypedLinkPage',
  fields: {
    link: f.link().required(),
    links: f.array(f.link()).required(),
  },
})

const _front: DataFront<typeof LinkPage> = {
  _id: 'page',
  _type: 'TypedLinkPage',
  link: { href: '/docs/', title: 'Documentation' },
  links: [{ href: '/about/', title: 'About' }],
}

const _href: string = _front.link.href
const _title: string = _front.link.title

const _input: DataInput<typeof LinkPage> = {
  _type: 'TypedLinkPage',
  link: { href: '/docs/', title: 'Documentation' },
  links: [{ href: '/contact/', title: 'Contact' }],
}

const _invalidInput: DataInput<typeof LinkPage> = {
  _type: 'TypedLinkPage',
  // @ts-expect-error New link input uses the titled object shape.
  link: '/legacy-docs/',
  links: [],
}

const _db: DBOutput<typeof LinkPage> = {
  _id: 'page',
  _type: 'TypedLinkPage',
  link: '/legacy-docs/',
  links: [{ href: '/about/', title: 'About' }],
}

const _invalidFront: DataFront<typeof LinkPage> = {
  _id: 'page',
  _type: 'TypedLinkPage',
  // @ts-expect-error Front link values always use the resolved object shape.
  link: '/legacy-docs/',
  links: [],
}
