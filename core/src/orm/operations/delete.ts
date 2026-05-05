import type { Db } from "mongodb";

import { checkFailureCase } from "../dbService";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { Filter } from "../../lib/types";

export const deleteHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
  ): Promise<void> => {
    checkFailureCase("DeletionError");

    await db
      .collection(contentType.name)
      .deleteMany(transformStringToObjectIds(filter));
  };
