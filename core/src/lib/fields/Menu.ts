import z from "zod";

import {
  createField,
  defaultFieldState,
  type DefaultFieldState,
  type EncodedField,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import {
  LinkInputSchema,
  ResolvedLinkSchema,
  type LinkfieldValue,
  type LinkOutputValue,
} from "./Link";

export type MenuItemValue = LinkfieldValue & {
  children: MenuItemValue[];
};

export type MenuItemOutput = LinkOutputValue & {
  children: MenuItemOutput[];
};

export const MenuItemSchema: z.ZodType<MenuItemValue> = z.lazy(() =>
  LinkInputSchema.and(
    z.object({
      children: z.array(MenuItemSchema),
    }),
  ),
);

export const MenuItemOutputSchema: z.ZodType<MenuItemOutput> = z.lazy(() =>
  ResolvedLinkSchema.and(
    z.object({
      children: z.array(MenuItemOutputSchema),
    }),
  ),
);

export const MenuValueSchema = z.array(MenuItemSchema);
export const MenuOutputSchema = z.array(MenuItemOutputSchema);

export type MenuFieldValue = z.infer<typeof MenuValueSchema>;
export type MenuFieldOutput = z.infer<typeof MenuOutputSchema>;

export type MenuMeta = {
  type: "Menu";
  ui: "Menu";
};

type MenuFieldCore<State extends FieldState> = FieldLike<
  MenuFieldValue,
  MenuFieldValue,
  MenuFieldOutput,
  MenuMeta,
  State
>;

export type MenuField<State extends FieldState = DefaultFieldState> =
  FieldWithModifiers<MenuFieldCore<State>>;

export type EncodedMenuField = EncodedField;

export function menuField(): MenuField {
  return makeMenuField(defaultFieldState);
}

function makeMenuField<State extends FieldState>(
  state: State,
): MenuField<State> {
  const field: MenuFieldCore<State> = createField({
    meta: { type: "Menu", ui: "Menu" },
    state,
    schemas: {
      input: () => MenuValueSchema,
      db: () => MenuValueSchema,
      output: () => MenuOutputSchema,
    },
  });

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeMenuField(nextState) as WithFieldState<
        MenuFieldCore<State>,
        NextState
      >,
  });
}
