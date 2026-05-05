import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";
import { Page } from "./Page";

export const RouteSettings = new ContentType({
  name: "RouteSettings",
  fields: {
    key: Fields.string().required(),
    homePage: Fields.relation(Page, "existing"),
  },
  uniques: [["key"]],
  listFields: ["key"],
}).hideFromManager();

export type RouteSettings = typeof RouteSettings;
export type RouteSettingsSchema = DataFront<RouteSettings>;
export type RouteSettingsManager = DBOutput<RouteSettings>;
export type RouteSettingsInput = DataInput<RouteSettings>;
