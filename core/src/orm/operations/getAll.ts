import type { Db } from "mongodb";

import { checkFailureCase } from "../dbService";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import ContentType from "../../lib/ContentType";
import { DBOutput, GetAllInput } from "../../lib/types";

export const getAllHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    query?: GetAllInput<T>,
  ): Promise<DBOutput<T>[]> => {
    checkFailureCase("FoundError");

    const { fields, sort } = query || {};

    const optionsQuery: Record<string, unknown> = {};

    if (fields) {
      Object.assign(optionsQuery, { projection: fields });
    }

    if (sort) {
      Object.assign(optionsQuery, { sort });
    }

    return transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .find<DBOutput<T>>(optionsQuery)
        .toArray(),
    ) as DBOutput<T>[];
  };
