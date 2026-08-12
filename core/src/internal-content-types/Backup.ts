import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const Backup = new ContentType({
  name: "Backup",
  permissions: "Backup",
  fields: {
    reason: Fields.string().type("Textarea").optional(),
    contentTypes: Fields.array(Fields.string()).required(),
    createdAt: Fields.date().type("DateTime").required(),
    createdBy: Fields.string().type("Id").optional(),
    documentCount: Fields.number().required(),
    status: Fields.select(["completed", "failed"]).required(),
    error: Fields.string().type("Textarea").optional(),
  },
}).hideFromManager();

export type Backup = typeof Backup;
export type BackupManager = DBOutput<Backup>;
