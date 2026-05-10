import type { Db } from "mongodb";

import { checkFailureCase } from "../dbService";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { DBOutput, Query } from "../../lib/types";

export const listhandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    query: Query<T>,
  ): Promise<{ totalItems: number; items: DBOutput<T>[] }> => {
    checkFailureCase("FoundError");

    const { filter, options } = query;

    const optionsQuery: Record<string, unknown> = {};

    if (options?.limit && options.limit !== "all") {
      Object.assign(optionsQuery, { limit: options.limit });
    }

    if (options?.page && options.limit !== "all") {
      const skip = (options.page - 1) * (options?.limit || 10);
      Object.assign(optionsQuery, { skip });
    }

    if (options?.fields) {
      Object.assign(optionsQuery, {
        projection: Object.fromEntries(
          options.fields.map((f) => [f.split(".").shift(), 1]),
        ),
      });
    }

    if (options?.sort) {
      Object.assign(optionsQuery, { sort: options.sort });
    }

    const items = transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .find<DBOutput<T>>(
          transformStringToObjectIds(filter || {}),
          optionsQuery,
        )
        .toArray(),
    ) as DBOutput<T>[];

    const totalItems = await db
      .collection(contentType.name)
      .countDocuments(transformStringToObjectIds(filter || {}));

    return { totalItems, items };
  };
