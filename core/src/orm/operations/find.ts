import type { Db } from "mongodb";

import { checkFailureCase } from "../dbService";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { DBOutput, FieldsQuery, Filter } from "../../lib/types";

export const findHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    fields?: FieldsQuery<T>,
  ): Promise<DBOutput<T> | null> => {
    checkFailureCase("FoundError");

    const document = transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .findOne<
          DBOutput<T>
        >(transformStringToObjectIds(filter || {}), { projection: fields }),
    );

    return document;
  };
