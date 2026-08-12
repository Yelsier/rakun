import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront } from "../lib/types";

export const RobotsRule = new ContentType({
  name: "RobotsRule",
  permissions: "RobotsRule",
  fields: {
    name: Fields.string().required(),
    enabled: Fields.boolean().required(),
    directive: Fields.select([
      "allow",
      "disallow",
      "crawlDelay",
      "sitemap",
      "host",
      "comment",
    ]).required(),
    userAgent: Fields.string().required(),
    path: Fields.string().optional(),
    value: Fields.string().optional(),
    crawlDelay: Fields.number().min(0).optional(),
    order: Fields.number().required(),
  },
  listFields: ["name", "enabled", "directive", "userAgent", "path", "order"],
}).hideFromManager();

export type RobotsRule = typeof RobotsRule;
export type RobotsRuleSchema = DataFront<RobotsRule>;
