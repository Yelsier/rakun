import type { Db } from "mongodb";

import { checkFailureCase, type DBMutationOptions } from "../dbService";
import { recordContentVersion } from "../versions";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { Filter } from "../../lib/types";

export const deleteHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    options?: DBMutationOptions,
  ): Promise<void> => {
    checkFailureCase("DeletionError");

    const transformedFilter = transformStringToObjectIds(filter);
    const versioned = !!contentType.versioning && !options?.skipVersioning;
    const before = versioned
      ? await db.collection(contentType.name).find(transformedFilter).toArray()
      : [];

    await db.collection(contentType.name).deleteMany(transformedFilter);

    if (versioned) {
      await Promise.all(
        before.map((document) =>
          recordContentVersion(db, contentType, {
            operation: "delete",
            actorId: options?.actorId,
            reason: options?.reason,
            before: document,
            after: null,
            revision: Number(document._revision ?? 0) + 1,
          }),
        ),
      );
    }
  };
