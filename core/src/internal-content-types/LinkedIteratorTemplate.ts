import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const LinkedIteratorTemplate = new ContentType({
  name: "LinkedIteratorTemplate",
  permissions: "LinkedIteratorTemplate",
  fields: {
    contentType: Fields.string().required(),
    payload: Fields.string().required(),
    revision: Fields.number().required(),
  },
  uniques: [["contentType"]],
  listFields: ["contentType", "revision"],
}).hideFromManager();

export type LinkedIteratorTemplate = typeof LinkedIteratorTemplate;
export type LinkedIteratorTemplateRecord = DBOutput<LinkedIteratorTemplate>;
