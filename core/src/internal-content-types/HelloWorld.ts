import ContentType from '../lib/ContentType'
import { Fields } from '../lib/fields'
import type { DataFront, DataInput, DBOutput } from '../lib/types'

export const HelloWorld = new ContentType({
  name: 'HelloWorld',
  fields: {
    text: Fields.string().translatable().required(),
  },
  uniques: [['text']],
}).hideFromManager()

export type HelloWorld = typeof HelloWorld
export type HelloWorldSchema = DataFront<HelloWorld>
export type HelloWorldManager = DBOutput<HelloWorld>
export type HelloWorldInput = DataInput<HelloWorld>
