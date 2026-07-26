import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const ManagerNotification = new ContentType({
  name: "ManagerNotification",
  permissions: "ManagerNotification",
  fields: {
    user: Fields.relation(ManagerUser, "existing").required(),
    author: Fields.relation(ManagerUser, "existing").required(),
    commentId: Fields.string().type("Id").required(),
    kind: Fields.select([
      "comment_mention",
      "review_requested",
      "review_approved",
      "review_changes_requested",
      "review_feedback",
    ]),
    reviewId: Fields.string().type("Id"),
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").required(),
    text: Fields.string().type("Textarea").required(),
    read: Fields.boolean().required(),
  },
  uniques: [["user", "commentId"]],
}).hideFromManager();

export type ManagerNotification = typeof ManagerNotification;
export type ManagerNotificationManager = DBOutput<ManagerNotification>;
