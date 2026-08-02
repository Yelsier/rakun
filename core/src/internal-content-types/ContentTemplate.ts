import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const ContentTemplate = new ContentType({
  name: "ContentTemplate",
  permissions: false,
  fields: {
    contentType: Fields.string().required(),
    payload: Fields.string().required(),
    revision: Fields.number().required(),
  },
  uniques: [["contentType"]],
  listFields: ["contentType", "revision"],
}).hideFromManager();

export type ContentTemplate = typeof ContentTemplate;
export type ContentTemplateRecord = DBOutput<ContentTemplate>;
