import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const SchemaState = new ContentType({
  name: "SchemaState",
  fields: {
    contentType: Fields.string().required(),
    version: Fields.number().required(),
    updatedAt: Fields.date().type("DateTime").required(),
  },
}).hideFromManager();

export type SchemaState = typeof SchemaState;
export type SchemaStateManager = DBOutput<SchemaState>;
