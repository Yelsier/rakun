import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const ContentComment = new ContentType({
  name: "ContentComment",
  permissions: "ContentComment",
  fields: {
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").required(),
    author: Fields.relation(ManagerUser, "existing").required(),
    text: Fields.string().type("Textarea").required(),
    mentions: Fields.relation(ManagerUser, "existing").multiple(),
  },
}).hideFromManager();

export type ContentComment = typeof ContentComment;
export type ContentCommentManager = DBOutput<ContentComment>;
