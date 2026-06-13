import type { Db } from "mongodb";

import {
  checkFailureCase,
  type DBMutationOptions,
  type DBService,
} from "../dbService";
import { findHandler } from "./find";
import { updateHandler } from "./update";
import { createHandler } from "./create";
import ContentType from "../../lib/ContentType";
import { DataInput, DBOutput, Filter } from "../../lib/types";

export const upsertHandler =
  (db: Db, getService: () => DBService) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    data: DataInput<T>,
    options?: DBMutationOptions,
  ): Promise<DBOutput<T>> => {
    checkFailureCase("UpdateError");

    const exists = await findHandler(db)(contentType, filter);

    if (exists) {
      return updateHandler(db, getService)(
        contentType,
        exists._id,
        {
          ...data,
          createdAt: undefined,
          createdBy: undefined,
        },
        options,
      );
    }

    return createHandler(db, getService)(contentType, data, options);
  };
