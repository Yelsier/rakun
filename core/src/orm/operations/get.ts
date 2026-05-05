import type { Db } from "mongodb";

import { checkFailureCase, DbErrorNotFound } from "../dbService";
import { parseId } from "../utils/parseId";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import ContentType from "../../lib/ContentType";
import { DBOutput, FieldsQuery } from "../../lib/types";
import { Id } from "../../lib/utils/id";

export const getHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    id: Id,
    fields?: FieldsQuery<T>,
  ): Promise<DBOutput<T>> => {
    checkFailureCase("FoundError");

    const document = transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .findOne<DBOutput<T>>({ _id: parseId(id) }, { projection: fields }),
    );

    if (!document) {
      throw new DbErrorNotFound("Document not found", {
        contentType: contentType.name,
        id,
      });
    }

    return document;
  };
