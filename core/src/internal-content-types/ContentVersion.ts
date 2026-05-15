import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const ContentVersion = new ContentType({
  name: "ContentVersion",
  fields: {
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").required(),
    revision: Fields.number().required(),
    operation: Fields.select(["create", "update", "delete", "restore"]).required(),
    actorId: Fields.string().type("Id"),
    reason: Fields.string().type("Textarea"),
    changedAt: Fields.date().type("DateTime").required(),
    schemaVersion: Fields.number(),
    diff: Fields.string().type("RichText").required(),
    snapshot: Fields.string().type("RichText"),
  },
}).hideFromManager();

export type ContentVersion = typeof ContentVersion;
export type ContentVersionManager = DBOutput<ContentVersion>;
