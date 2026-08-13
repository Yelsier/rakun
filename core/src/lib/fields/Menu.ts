import z from 'zod'

import {
  createField,
  defaultFieldState,
  type DefaultFieldState,
  type EncodedField,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type FieldCapabilities,
  type WithFieldState,
  withFieldModifiers,
} from './Field'
import {
  LinkInputSchema,
  ResolvedLinkSchema,
  type LinkfieldValue,
  type LinkOutputValue,
} from './Link'

export type MenuItemValue = LinkfieldValue & {
  children: MenuItemValue[]
}

export type MenuItemOutput = LinkOutputValue & {
  children: MenuItemOutput[]
}

export const MenuItemSchema: z.ZodType<MenuItemValue> = z.lazy(() =>
  LinkInputSchema.and(
    z.object({
      children: z.array(MenuItemSchema),
    })
  )
)

export const MenuItemOutputSchema: z.ZodType<MenuItemOutput> = z.lazy(() =>
  ResolvedLinkSchema.and(
    z.object({
      children: z.array(MenuItemOutputSchema),
    })
  )
)

export const MenuValueSchema = z.array(MenuItemSchema)
export const MenuOutputSchema = z.array(MenuItemOutputSchema)

export type MenuFieldValue = z.infer<typeof MenuValueSchema>
export type MenuFieldOutput = z.infer<typeof MenuOutputSchema>

export type MenuMeta = {
  type: 'Menu'
  ui: 'Menu'
  capabilities: FieldCapabilities
}

type MenuFieldCore<State extends FieldState> = FieldLike<
  MenuFieldValue,
  MenuFieldValue,
  MenuFieldOutput,
  MenuMeta,
  State
>

export type MenuField<State extends FieldState = DefaultFieldState> = FieldWithModifiers<
  MenuFieldCore<State>
>

export type EncodedMenuField = EncodedField

export function menuField(): MenuField {
  return makeMenuField(defaultFieldState)
}

function makeMenuField<State extends FieldState>(state: State): MenuField<State> {
  const field: MenuFieldCore<State> = createField({
    meta: {
      type: 'Menu',
      ui: 'Menu',
      capabilities: { valueKind: 'array' },
    },
    runtime: {
      populate: async (value, context) => {
        const populateItems = async (items: unknown[]): Promise<unknown[]> =>
          Promise.all(
            items.map(async (item) => {
              if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return item
              }

              const record = item as Record<string, unknown>
              return {
                ...((await context.populateLink(record)) as Record<string, unknown>),
                children: await populateItems(
                  Array.isArray(record.children) ? record.children : []
                ),
              }
            })
          )

        return Array.isArray(value) ? populateItems(value) : value
      },
    },
    state,
    schemas: {
      input: () => MenuValueSchema,
      db: () => MenuValueSchema,
      output: () => MenuOutputSchema,
    },
  })

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeMenuField(nextState) as WithFieldState<MenuFieldCore<State>, NextState>,
  })
}
