import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const RouteLocaleVariant = new ContentType({
  name: "RouteLocaleVariant",
  permissions: "Route",
  fields: {
    routeId: Fields.string().type("Id").required(),
    routeKey: Fields.string().required(),
    contentType: Fields.string().required(),
    groupId: Fields.string().type("Id").required(),
    languageId: Fields.string().type("Id").required(),
    documentId: Fields.string().type("Id").required(),
  },
  uniques: [["routeId", "groupId", "languageId"]],
  listFields: ["routeKey", "contentType", "groupId"],
}).hideFromManager();

export type RouteLocaleVariant = typeof RouteLocaleVariant;
export type RouteLocaleVariantSchema = DataFront<RouteLocaleVariant>;
export type RouteLocaleVariantManager = DBOutput<RouteLocaleVariant>;
export type RouteLocaleVariantInput = DataInput<RouteLocaleVariant>;
