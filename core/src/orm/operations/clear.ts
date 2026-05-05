import type { Db } from "mongodb";

import { checkFailureCase } from "../dbService";
import ContentType from "../../lib/ContentType";

export const clearHandler =
  (db: Db) =>
  async <T extends ContentType>(contentType: T): Promise<void> => {
    checkFailureCase("DeletionError");

    await db.collection(contentType.name).deleteMany({});
  };
