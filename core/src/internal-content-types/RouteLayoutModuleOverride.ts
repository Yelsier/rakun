import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const RouteLayoutModuleOverride = new ContentType({
  name: "RouteLayoutModuleOverride",
  permissions: "Route",
  fields: {
    routeId: Fields.string().type("Id").required(),
    routeKey: Fields.string().required(),
    contentTypeId: Fields.string().type("Id").required(),
    key: Fields.string().required(),
    contentType: Fields.string().required(),
    moduleId: Fields.string().optional(),
  },
  uniques: [["routeId", "contentTypeId", "key"]],
  listFields: ["routeKey", "key", "contentType"],
}).hideFromManager();

export type RouteLayoutModuleOverride = typeof RouteLayoutModuleOverride;
export type RouteLayoutModuleOverrideSchema =
  DataFront<RouteLayoutModuleOverride>;
export type RouteLayoutModuleOverrideManager =
  DBOutput<RouteLayoutModuleOverride>;
export type RouteLayoutModuleOverrideInput = DataInput<
  RouteLayoutModuleOverride
>;
