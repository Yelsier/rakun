import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const ApiOperation = new ContentType({
  name: "ApiOperation",
  permissions: {
    resource: "ApiOperation",
    actions: ["readAny"],
  },
  fields: {
    name: Fields.string().required(),
    method: Fields.string().required(),
    path: Fields.string().required(),
    kind: Fields.string().required(),
  },
  listFields: ["name", "method", "path"],
}).hideFromManager();

export type ApiOperation = typeof ApiOperation;
export type ApiOperationManager = DBOutput<ApiOperation>;
