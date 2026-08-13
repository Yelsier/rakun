import z from 'zod'

import {
  createField,
  defaultFieldState,
  type EncodedField,
  sameSchemas,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldStateOf,
  type FieldWithModifiers,
  type FieldCapabilities,
  type WithFieldState,
  withFieldModifiers,
} from './Field'
import { Id } from '../utils/id'

export type SelfRelationValue<Name extends string = string> = {
  type: 'self'
  _id: string
  contentType: Name
}

export type SelfRelationMeta<Name extends string = string> = {
  type: 'Relation'
  ui: 'SelfRelation'
  contentType?: Name
  capabilities: FieldCapabilities
}

export type SelfRelationField<
  Name extends string = string,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<SelfRelationFieldCore<Name, State>>

type SelfRelationFieldCore<Name extends string, State extends FieldState> = SelfRelationFieldBase<
  Name,
  State
> & {
  setContentType: <TThis extends SelfRelationFieldBase<Name, FieldState>, NextName extends string>(
    this: TThis,
    contentType: { name: NextName }
  ) => SelfRelationField<NextName, FieldStateOf<TThis>>
}

type SelfRelationFieldBase<Name extends string, State extends FieldState> = FieldLike<
  SelfRelationValue<Name>,
  SelfRelationValue<Name>,
  SelfRelationValue<Name>,
  SelfRelationMeta<Name>,
  State
>

export function selfRelationField(): SelfRelationField {
  return makeSelfRelationField({}, defaultFieldState)
}

export type EncodedSelfRelationField = EncodedField

function makeSelfRelationField<Name extends string, State extends FieldState>(
  options: { contentType?: Name },
  state: State
): SelfRelationField<Name, State> {
  const field: SelfRelationFieldCore<Name, State> = {
    ...createField({
      meta: {
        type: 'Relation',
        ui: 'SelfRelation',
        contentType: options.contentType,
        capabilities: { valueKind: 'object' },
      },
      state,
      schemas: sameSchemas(() => buildSelfRelationSchema(options.contentType)),
    }),
    setContentType: function <
      TThis extends SelfRelationFieldBase<Name, FieldState>,
      NextName extends string,
    >(this: TThis, contentType: { name: NextName }) {
      return makeSelfRelationField(
        { contentType: contentType.name },
        this.state as FieldStateOf<TThis>
      )
    },
  }

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeSelfRelationField(options, nextState) as WithFieldState<
        SelfRelationFieldCore<Name, State>,
        NextState
      >,
  })
}

function buildSelfRelationSchema<Name extends string>(contentType?: Name) {
  return z.object({
    type: z.literal('self'),
    _id: Id,
    contentType: contentType ? z.literal(contentType) : z.string(),
  }) as z.ZodType<SelfRelationValue<Name>>
}
