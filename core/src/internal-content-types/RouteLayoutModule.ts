import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const RouteLayoutModule = new ContentType({
  name: "RouteLayoutModule",
  permissions: "Route",
  fields: {
    routeId: Fields.string().type("Id").required(),
    routeKey: Fields.string().required(),
    routeContentType: Fields.string().required(),
    key: Fields.string().required(),
    contentType: Fields.string().required(),
    order: Fields.number().required(),
    moduleId: Fields.string().optional(),
  },
  uniques: [["routeId", "key"]],
  listFields: ["routeKey", "key", "contentType"],
}).hideFromManager();

export type RouteLayoutModule = typeof RouteLayoutModule;
export type RouteLayoutModuleSchema = DataFront<RouteLayoutModule>;
export type RouteLayoutModuleManager = DBOutput<RouteLayoutModule>;
export type RouteLayoutModuleInput = DataInput<RouteLayoutModule>;
