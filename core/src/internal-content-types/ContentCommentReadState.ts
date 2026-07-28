import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const ContentCommentReadState = new ContentType({
  name: "ContentCommentReadState",
  permissions: "ContentCommentReadState",
  fields: {
    user: Fields.relation(ManagerUser, "existing").required(),
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").required(),
    lastReadCommentId: Fields.string().type("Id").required(),
  },
  uniques: [["user", "contentType", "documentId"]],
}).hideFromManager();

export type ContentCommentReadState = typeof ContentCommentReadState;
export type ContentCommentReadStateManager = DBOutput<ContentCommentReadState>;
