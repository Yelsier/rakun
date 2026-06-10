import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const Migration = new ContentType({
  name: "Migration",
  permissions: {
    resource: "Migration",
    actions: ["readAny"],
  },
  fields: {
    contentType: Fields.string().required(),
    migrationId: Fields.string().required(),
    from: Fields.number().required(),
    to: Fields.number().required(),
    description: Fields.string().type("Textarea"),
    status: Fields.select(["running", "completed", "failed"]).required(),
    backupId: Fields.string().type("Id"),
    startedAt: Fields.date().type("DateTime").required(),
    completedAt: Fields.date().type("DateTime"),
    failedAt: Fields.date().type("DateTime"),
    error: Fields.string().type("Textarea"),
  },
}).hideFromManager();

export type Migration = typeof Migration;
export type MigrationManager = DBOutput<Migration>;
