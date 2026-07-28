import type { Db } from "mongodb";

import type { DBService } from "../dbService";
import ContentType from "../../lib/ContentType";
import { deleteHandler } from "./delete";

export const clearHandler =
  (db: Db, getService: () => DBService) =>
  async <T extends ContentType>(contentType: T): Promise<void> => {
    await deleteHandler(db, getService)(contentType, {});
  };
