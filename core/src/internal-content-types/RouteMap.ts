import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DBOutput } from "../lib/types";

export const RouteMap = new ContentType({
  name: "RouteMap",
  permissions: {
    resource: "Route",
    actions: ["readAny"],
  },
  fields: {
    path: Fields.string().required(),
    contentType: Fields.string().required(),
    contentTypeId: Fields.string().type("Id").required(),
    routeId: Fields.string().type("Id").required(),
    languageId: Fields.string().type("Id").required(),
    lastModified: Fields.date().type("DateTime"),
  },
  uniques: [["path"]],
}).hideFromManager();

export type RouteMap = typeof RouteMap;
export type RouteMapSchema = DataFront<RouteMap>;
export type RouteMapManager = DBOutput<RouteMap>;
