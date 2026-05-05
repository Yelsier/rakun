import { z } from "zod";

import type { EncodedFieldUnknown, Field } from "./fields/Field";
import { SelfRelationField } from "./fields/SelfRelation";
import { RelationField } from "./fields/Relation";
import { DataPopulated, NestedPaths } from "./types";
import { isNeverOptional } from "./utils/isNeverOptional";
import { IteratorField } from "./fields/Iterator";

export const Menu = z
  .object({
    title: z.string(),
    icon: z.string().optional(),
    category: z.string().optional(),
  })
  .optional();

export type Menu = z.infer<typeof Menu>;

type ApiOnlyFields<
  F extends Record<string, Field<any, any, any, any, any, any>>,
> = {
  [K in keyof F]: ReturnType<F[K]["apiOnly"]>;
};

type ManagerOnlyFields<
  F extends Record<string, Field<any, any, any, any, any, any>>,
> = {
  [K in keyof F]: ReturnType<F[K]["managerOnly"]>;
};

export default class ContentType<
  F extends Record<string, Field<any, any, any, any, any, any>> = Record<
    string,
    Field<any, any, any, any, any, any>
  >,
  N extends string = string,
> {
  name: N;
  fields: F;
  menu?: Menu;
  uniques: Array<Array<string>> = [];
  listFields?: string[];
  collapseFields?: string[];
  isHiddenFromManager?: boolean;

  constructor(params: {
    name: N;
    fields: F;
    menu?: Menu;
    uniques?: Array<Array<keyof F>>;
    listFields?: NestedPaths<DataPopulated<ContentType<F, N>>>[];
  }) {
    this.name = params.name;
    this.fields = params.fields;
    this.menu = params.menu;
    this.listFields = params.listFields as string[];
    this.uniques = (params.uniques as Array<Array<string>>) || [];

    this.setSelfRelateds();
  }

  setSelfRelateds() {
    Object.values(this.fields).forEach((field) => {
      if (field instanceof SelfRelationField) {
        field.setContentType(this);
      }
      if (field instanceof RelationField) {
        field.setSelfRelateds();
      }
    });
  }

  getInputSchema() {
    return z.object(
      Object.fromEntries([
        ...Object.entries(this.fields).map(([key, field]) => [
          key,
          field.getInputSchema(),
        ]),
        ["_type", z.literal(this.name)],
        ["createdBy", z.string().optional()],
        ["updatedBy", z.string().optional()],
      ]) as {
        [K in keyof F]: ReturnType<F[K]["getInputSchema"]>;
      } & {
        _type: z.ZodLiteral<N>;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
      },
    );
  }

  getSchema() {
    return z.object(
      Object.fromEntries([
        ...Object.entries(this.fields).map(([key, field]) => [
          key,
          field.getSchema(),
        ]),
        ["_type", z.literal(this.name)],
      ]) as {
        [K in keyof F]: ReturnType<F[K]["getSchema"]>;
      } & {
        _type: z.ZodLiteral<N>;
      },
    );
  }

  getPopulatedSchema() {
    return z.object(
      Object.fromEntries([
        ...Object.entries(this.fields).map(([key, field]) => [
          key,
          field instanceof RelationField
            ? field.getPopulatedSchema()
            : field.getSchema(),
        ]),
        ["_type", z.literal(this.name)],
        ["_id", z.string()],
        ["createdBy", z.string().optional()],
        ["updatedBy", z.string().optional()],
      ]) as {
        [K in keyof F]: F[K] extends {
          getPopulatedSchema: () => z.ZodTypeAny;
        }
          ? ReturnType<F[K]["getPopulatedSchema"]>
          : ReturnType<F[K]["getSchema"]>;
      } & {
        _type: z.ZodLiteral<N>;
        _id: z.ZodString;
        createdBy: z.ZodOptional<z.ZodString>;
        updatedBy: z.ZodOptional<z.ZodString>;
      },
    );
  }

  getOutputSchema() {
    return z.object(
      Object.fromEntries([
        ...Object.entries(this.fields)
          .map(([key, field]) => [key, field.getOutputSchema()])
          .filter(([, schema]) => !isNeverOptional(schema)),
        ["_type", z.literal(this.name)],
        ["_id", z.string()],
      ]) as {
        [K in keyof F]: ReturnType<F[K]["getOutputSchema"]>;
      } & {
        _type: z.ZodLiteral<N>;
        _id: z.ZodString;
      },
    );
  }

  getOutputSchemaWithoutIterators() {
    return z.object(
      Object.fromEntries([
        ...Object.entries(this.fields)
          .filter(([, field]) => !(field instanceof IteratorField))
          .map(([key, field]) => [key, field.getOutputSchema()])
          .filter(([, schema]) => !isNeverOptional(schema)),
        ["_type", z.literal(this.name)],
        ["_id", z.string()],
      ]) as {
        [K in keyof F]: F[K] extends IteratorField<any, any, any, any, any, any>
          ? never
          : ReturnType<F[K]["getOutputSchema"]>;
      } & {
        _type: z.ZodLiteral<N>;
        _id: z.ZodString;
      },
    );
  }

  validate(data: unknown) {
    return this.getInputSchema().parse(data);
  }

  partialValidate(data: unknown) {
    return this.getInputSchema().partial().parse(data);
  }

  validateOutput(data: unknown) {
    return this.getOutputSchema().parse(data);
  }

  hideFromManager() {
    this.isHiddenFromManager = true;
    return this;
  }

  apiOnly() {
    Object.values(this.fields).forEach((field) => field.apiOnly());
    return this as unknown as ContentType<ApiOnlyFields<F>, N>;
  }

  managerOnly() {
    Object.values(this.fields).forEach((field) => field.managerOnly());
    return this as unknown as ContentType<ManagerOnlyFields<F>, N>;
  }
}

export const EncodedContentTypeSchema = z.object({
  name: z.string(),
  fields: z.record(z.string(), z.unknown()),
  menu: Menu,
  uniques: z.array(z.array(z.string())),
  listFields: z.array(z.string()).optional(),
  isHiddenFromManager: z.boolean().optional(),
});

export type EncodedContentType = z.infer<typeof EncodedContentTypeSchema> & {
  fields: Record<string, EncodedFieldUnknown>;
};
