import z from 'zod'

import {
  createField,
  type EncodedField,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from './Field'

export const BreadcrumbSchema = z.object({
  label: z.string(),
  href: z.string(),
})

export type Breadcrumb = z.infer<typeof BreadcrumbSchema>
export type BreadcrumsValue = Breadcrumb[] | null

export type BreadcrumsMeta = {
  type: 'Breadcrums'
  ui: 'Breadcrums'
}

type BreadcrumsState = {
  required: true
  translatable: false
  visibility: 'api'
  dynamic: false
  description?: undefined
  condition?: undefined
}

const breadcrumsState: BreadcrumsState = {
  required: true,
  translatable: false,
  visibility: 'api',
  dynamic: false,
}

type BreadcrumsFieldCore<State extends FieldState> = FieldLike<
  never,
  never,
  BreadcrumsValue,
  BreadcrumsMeta,
  State
>

export type BreadcrumsField<
  State extends FieldState = BreadcrumsState,
> = FieldWithModifiers<BreadcrumsFieldCore<State>>
export type EncodedBreadcrumsField = EncodedField

export function breadcrumsField(): BreadcrumsField {
  return makeBreadcrumsField(breadcrumsState)
}

function makeBreadcrumsField<State extends FieldState>(
  state: State,
): BreadcrumsField<State> {
  const field: BreadcrumsFieldCore<State> = createField({
    meta: { type: 'Breadcrums', ui: 'Breadcrums' },
    state,
    schemas: {
      input: () => z.never(),
      db: () => z.never(),
      output: () => z.array(BreadcrumbSchema).nullable(),
    },
  })

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeBreadcrumsField(nextState) as WithFieldState<
        BreadcrumsFieldCore<State>,
        NextState
      >,
  })
}
