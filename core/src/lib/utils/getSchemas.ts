import z from "zod";

import type {
  getTypeWithModifiers,
  Visibility,
  If,
  Extends,
  Or,
  getOutputTypeWithModifiers,
  getInputTypeWithModifiers,
} from "../types";

export function getDefaultInputSchema<
  S extends z.ZodTypeAny,
  TRequired extends boolean,
  TTranslatable extends boolean,
>(baseSchema: S, isRequired: boolean, isTranslatable: boolean) {
  let schema = baseSchema as z.ZodTypeAny;

  if (isTranslatable) {
    schema = z
      .object({
        _tag: z.literal("Translatable"),
      })
      .catchall(schema);
  }

  if (!isRequired) {
    schema = schema.nullish();
  }

  return schema as getInputTypeWithModifiers<S, TRequired, TTranslatable>;
}

export function getDefaultSchema<
  S extends z.ZodTypeAny,
  TRequired extends boolean,
  TTranslatable extends boolean,
>(baseSchema: S, isRequired: boolean, isTranslatable: boolean) {
  let schema = baseSchema as z.ZodTypeAny;

  if (isTranslatable) {
    schema = z
      .object({
        _tag: z.literal("Translatable"),
      })
      .catchall(schema);
  }

  if (!isRequired) {
    schema = schema.optional();
  }

  return schema as getTypeWithModifiers<S, TRequired, TTranslatable>;
}

export function getDefaultOutputSchema<
  S extends z.ZodTypeAny,
  TRequired extends boolean,
>(baseSchema: S, isRequired: boolean) {
  let schema = baseSchema as z.ZodTypeAny;

  if (!isRequired) {
    schema = schema.optional();
  }

  return schema as getOutputTypeWithModifiers<S, TRequired>;
}

export function getDefaultApiSchema<
  TVisibility extends Visibility,
  Func extends (...args: unknown[]) => unknown,
>(visibility: TVisibility, func: Func) {
  return getDefaultSchemaWrapper(visibility, func, "api");
}

export function getDefaultManagerSchema<
  TVisibility extends Visibility,
  Func extends (...args: unknown[]) => unknown,
>(visibility: TVisibility, func: Func) {
  return getDefaultSchemaWrapper(visibility, func, "manager");
}

export function getDefaultSchemaWrapper<
  TVisibility extends Visibility,
  Func extends (...args: unknown[]) => unknown,
  Check extends Visibility,
>(visibility: TVisibility, func: Func, check: Check) {
  type SchemaType = If<
    Or<Extends<TVisibility, Check>, Extends<TVisibility, "all">>,
    ReturnType<Func>,
    z.ZodOptional<z.ZodNever>
  >;
  if (
    (visibility as Visibility) === (check as Visibility) ||
    visibility === "all"
  ) {
    return func() as SchemaType;
  }
  return z.never().optional() as SchemaType;
}
