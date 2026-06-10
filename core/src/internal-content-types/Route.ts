import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";

export const Route = new ContentType({
  name: "Route",
  permissions: "Route",
  fields: {
    basePath: Fields.string().type("Slug").required().translatable(),
    contentType: Fields.string().required(),
    field: Fields.string().required(),
    parent: Fields.selfRelation(),
    parentRelationField: Fields.string(),
    hasPage: Fields.boolean().required(),
    dynamic: Fields.boolean().required(),
    layoutContentOrder: Fields.number().required(),
  },
  uniques: [["contentType", "field"]],
}).hideFromManager();

export type Route = typeof Route;
export type RouteSchema = DataFront<Route>;
export type RouteManager = DBOutput<Route>;
export type RouteInput = DataInput<Route>;
