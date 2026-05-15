import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";

export const MigrationLock = new ContentType({
  name: "MigrationLock",
  fields: {
    acquiredAt: Fields.date().type("DateTime").required(),
  },
}).hideFromManager();

export type MigrationLock = typeof MigrationLock;
export type MigrationLockManager = DBOutput<MigrationLock>;
