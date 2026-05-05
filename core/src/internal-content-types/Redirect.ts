import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront } from "../lib/types";

export const Redirect = new ContentType({
  name: "Redirect",
  fields: {
    name: Fields.string().required(),
    enabled: Fields.boolean().required(),
    sourcePath: Fields.string().required(),
    destinationPath: Fields.string().required(),
    statusMode: Fields.select([
      "301",
      "302",
      "307",
      "308",
      "custom",
    ]).required(),
    customStatus: Fields.number().min(300).max(399),
    preserveQuery: Fields.boolean().required(),
    headerName: Fields.string(),
    headerMatchMode: Fields.select([
      "none",
      "exists",
      "equals",
      "contains",
      "startsWith",
      "regex",
    ]).required(),
    headerValue: Fields.string(),
    functionName: Fields.select([
      "none",
      "acceptLanguageToParam",
      "headerValueToParam",
    ]).required(),
    functionConfig: Fields.string().type("Textarea"),
  },
  listFields: [
    "name",
    "enabled",
    "sourcePath",
    "destinationPath",
    "statusMode",
    "functionName",
  ],
  uniques: [["sourcePath", "headerName", "headerValue"]],
}).hideFromManager();

export type Redirect = typeof Redirect;
export type RedirectSchema = DataFront<Redirect>;
