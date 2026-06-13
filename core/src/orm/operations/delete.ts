import type { Db } from "mongodb";

import {
  checkFailureCase,
  type DBMutationOptions,
  type DBService,
} from "../dbService";
import { recordContentVersion } from "../versions";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { DBOutput, Filter } from "../../lib/types";
import {
  hasContentHooks,
  runAfterDeleteHook,
  runBeforeDeleteHook,
} from "../../api/hooks/runContentHooks";

export const deleteHandler =
  (db: Db, getService: () => DBService) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    options?: DBMutationOptions,
  ): Promise<void> => {
    checkFailureCase("DeletionError");
    const hookDb = getService();

    const transformedFilter = transformStringToObjectIds(filter);
    const versioned = !!contentType.versioning && !options?.skipVersioning;
    const needsDocuments =
      versioned ||
      hasContentHooks(contentType, ["beforeDelete", "afterDelete"]);
    const before = needsDocuments
      ? await db.collection(contentType.name).find(transformedFilter).toArray()
      : [];
    const documents = transformObjectIdsToStrings(
      before,
    ) as unknown as DBOutput<T>[];

    await runBeforeDeleteHook({
      db: hookDb,
      contentType,
      filter,
      documents,
      options,
    });

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

    await runAfterDeleteHook({
      db: hookDb,
      contentType,
      filter,
      documents,
      options,
    });
  };
