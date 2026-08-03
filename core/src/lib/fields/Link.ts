import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  type DefaultFieldState,
  type FieldLike,
  type FieldState,
  type FieldWithModifiers,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import { Id } from "../utils/id";

const internalLinkInputSchema = z.object({
  routeId: Id,
  contentTypeId: Id,
  title: z.string().optional(),
});

const directLinkInputSchema = z.object({
  href: z.string().min(1),
  title: z.string(),
});

const linkInputSchema = z.union([
  z.string().min(1),
  internalLinkInputSchema,
  directLinkInputSchema,
]);

const resolvedLinkSchema = z.object({
  href: z.string(),
  title: z.string(),
});

const linkOutputSchema = z
  .union([z.string(), resolvedLinkSchema])
  .transform((value) =>
    typeof value === "string" ? { href: value, title: "" } : value,
  );

type LinkInput = z.infer<typeof linkInputSchema>;
type LinkOutput = z.infer<typeof linkOutputSchema>;

export type LinkfieldValue = LinkInput;
export type LinkOutputValue = LinkOutput;

export type LinkMeta = {
  type: "Link";
  ui: "Link";
};

export type LinkField<
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<LinkFieldCore<State>>;

type LinkFieldCore<State extends FieldState> = FieldLike<
  LinkInput,
  LinkInput,
  LinkOutput,
  LinkMeta,
  State
>;

export function linkField(): LinkField {
  return makeLinkField(defaultFieldState);
}

export type EncodedLinkField = EncodedField;

function makeLinkField<State extends FieldState>(state: State): LinkField<State> {
  const field: LinkFieldCore<State> = createField({
    meta: { type: "Link", ui: "Link" },
    state,
    schemas: {
      input: () => linkInputSchema,
      db: () => linkInputSchema,
      output: () => linkOutputSchema,
    },
  });

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeLinkField(nextState) as WithFieldState<
        LinkFieldCore<State>,
        NextState
      >,
  });
}
