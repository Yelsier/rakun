import z from 'zod'

import {
  createField,
  defaultFieldState,
  type EncodedField,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type FieldCapabilities,
  type WithFieldState,
  withFieldModifiers,
} from './Field'
import { Id } from '../utils/id'

export const InternalLinkInputSchema = z.object({
  routeId: Id,
  contentTypeId: Id,
  title: z.string().optional(),
})

export const DirectLinkInputSchema = z.object({
  href: z.string().min(1),
  title: z.string(),
})

export const LinkInputSchema = z.union([InternalLinkInputSchema, DirectLinkInputSchema])

export const LinkDbSchema = z.union([z.string().min(1), LinkInputSchema])

export const ResolvedLinkSchema = z.object({
  href: z.string(),
  title: z.string(),
})

export const LinkOutputSchema = z
  .union([z.string(), ResolvedLinkSchema])
  .transform((value) => (typeof value === 'string' ? { href: value, title: '' } : value))

type LinkInput = z.infer<typeof LinkInputSchema>
type LinkDb = z.infer<typeof LinkDbSchema>
type LinkOutput = z.infer<typeof LinkOutputSchema>

export type LinkfieldValue = LinkInput
export type LinkOutputValue = LinkOutput

export type LinkMeta = {
  type: 'Link'
  ui: 'Link'
  capabilities: FieldCapabilities
}

export type LinkField<State extends FieldState = DefaultFieldState> = FieldWithModifiers<
  LinkFieldCore<State>
>

type LinkFieldCore<State extends FieldState> = FieldLike<
  LinkInput,
  LinkDb,
  LinkOutput,
  LinkMeta,
  State
>

export function linkField(): LinkField {
  return makeLinkField(defaultFieldState)
}

export type EncodedLinkField = EncodedField

function makeLinkField<State extends FieldState>(state: State): LinkField<State> {
  const field: LinkFieldCore<State> = createField({
    meta: {
      type: 'Link',
      ui: 'Link',
      capabilities: {
        valueKind: 'object',
        dynamic: {
          properties: { title: 'string', href: 'string' },
          mapProperties: true,
        },
      },
    },
    runtime: {
      populate: (value, context) => context.populateLink(value),
    },
    state,
    schemas: {
      input: () => LinkInputSchema,
      db: () => LinkDbSchema,
      output: () => LinkOutputSchema,
    },
  })

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeLinkField(nextState) as WithFieldState<LinkFieldCore<State>, NextState>,
  })
}
