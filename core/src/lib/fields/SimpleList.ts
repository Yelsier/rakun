import z from 'zod'

import {
  createField,
  defaultFieldState,
  type AnyFieldLike,
  type DefaultFieldState,
  type EncodedField,
  type EncodedFieldUnknown,
  type FieldLike,
  type FieldOutput,
  type FieldState,
  type FieldStateOf,
  type InferDb,
  type InferInput,
  type InferOutput,
  type InferPopulated,
  type PopulatableFieldLike,
  type WithFieldState,
  withFieldModifiers,
  type FieldWithModifiers,
  type FieldCapabilities,
} from './Field'

type SimpleListInput<F extends AnyFieldLike> = InferInput<F>[]
type SimpleListDb<F extends AnyFieldLike> = InferDb<F>[]
type SimpleListOutput<F extends AnyFieldLike> = InferOutput<F>[]
type SimpleListPopulated<F extends AnyFieldLike> = InferPopulated<F>[]

export type SimpleListMeta<F extends AnyFieldLike = AnyFieldLike> = {
  type: 'List'
  ui: 'SimpleList'
  field: F['meta']
  minItems?: number
  maxItems?: number
  capabilities: FieldCapabilities
}

export type EncodedSimpleListField = EncodedField & {
  field: EncodedFieldUnknown
  minItems?: number
  maxItems?: number
}

export type SimpleListField<
  F extends AnyFieldLike = AnyFieldLike,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<SimpleListFieldCore<F, State>>

type SimpleListFieldCore<F extends AnyFieldLike, State extends FieldState> = FieldLike<
  SimpleListInput<F>,
  SimpleListDb<F>,
  SimpleListOutput<F>,
  SimpleListMeta<F>,
  State
> &
  PopulatableFieldLike<SimpleListPopulated<F>, State> & {
    field: F
    min: <TThis extends SimpleListFieldCore<F, FieldState>>(
      this: TThis,
      count: number
    ) => SimpleListField<F, FieldStateOf<TThis>>
    max: <TThis extends SimpleListFieldCore<F, FieldState>>(
      this: TThis,
      count: number
    ) => SimpleListField<F, FieldStateOf<TThis>>
  }

type SimpleListOptions = {
  minItems?: number
  maxItems?: number
}

export function simpleListField<F extends AnyFieldLike>(field: F): SimpleListField<F> {
  return makeSimpleListField(field, {}, defaultFieldState)
}

function makeSimpleListField<F extends AnyFieldLike, State extends FieldState>(
  field: F,
  options: SimpleListOptions,
  state: State
): SimpleListField<F, State> {
  const core: SimpleListFieldCore<F, State> = {
    ...createField({
      meta: {
        type: 'List',
        ui: 'SimpleList',
        field: field.meta,
        minItems: options.minItems,
        maxItems: options.maxItems,
        capabilities: {
          valueKind: 'array',
          dynamic: { collection: 'homogeneous' },
        },
      },
      runtime: {
        populate: (value, context) =>
          Array.isArray(value)
            ? Promise.all(value.map((item) => context.populate(item, field)))
            : value,
      },
      state,
      schemas: {
        input: () =>
          applySimpleListLimits(z.array(field.getInputSchema()), options) as z.ZodType<
            SimpleListInput<F>
          >,
        db: () =>
          applySimpleListLimits(z.array(field.getSchema()), options) as z.ZodType<SimpleListDb<F>>,
        output: () =>
          applySimpleListLimits(z.array(field.getOutputSchema()), options) as z.ZodType<
            SimpleListOutput<F>
          >,
      },
    }),
    getPopulatedSchema: () =>
      applySimpleListOutputPresence(
        applySimpleListLimits(z.array(getFieldPopulatedSchema(field)), options) as z.ZodType<
          SimpleListPopulated<F>
        >,
        state
      ) as z.ZodType<FieldOutput<SimpleListPopulated<F>, State>>,
    field,
    min: function <TThis extends SimpleListFieldCore<F, FieldState>>(this: TThis, count: number) {
      return makeSimpleListField(
        field,
        { ...options, minItems: count },
        this.state as FieldStateOf<TThis>
      )
    },
    max: function <TThis extends SimpleListFieldCore<F, FieldState>>(this: TThis, count: number) {
      return makeSimpleListField(
        field,
        { ...options, maxItems: count },
        this.state as FieldStateOf<TThis>
      )
    },
  }

  return withFieldModifiers({
    field: core,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeSimpleListField(field, options, nextState) as WithFieldState<
        SimpleListFieldCore<F, State>,
        NextState
      >,
  })
}

function applySimpleListLimits<Item extends z.ZodTypeAny>(
  schema: z.ZodArray<Item>,
  options: SimpleListOptions
) {
  let next = schema

  if (options.minItems !== undefined) {
    next = next.min(options.minItems)
  }

  if (options.maxItems !== undefined) {
    next = next.max(options.maxItems)
  }

  return next
}

function hasPopulatedSchema(
  field: AnyFieldLike
): field is AnyFieldLike & PopulatableFieldLike<unknown, FieldState> {
  return 'getPopulatedSchema' in field && typeof field.getPopulatedSchema === 'function'
}

function getFieldPopulatedSchema(field: AnyFieldLike) {
  return hasPopulatedSchema(field) ? field.getPopulatedSchema() : field.getSchema()
}

function applySimpleListOutputPresence<Value, State extends FieldState>(
  schema: z.ZodType<Value>,
  state: State
) {
  return state.required ? schema : schema.optional()
}
