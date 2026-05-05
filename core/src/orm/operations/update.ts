import type { Db } from "mongodb";
import { ZodError } from "zod";

import {
  checkFailureCase,
  DbError,
  DbErrorConflict,
  DbErrorInvalidData,
  DbErrorNotFound,
  DbErrorUnknown,
} from "../dbService";
import { parseId } from "../utils/parseId";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import { deepDeleteNulls } from "../utils/deepDeleteNulls";
import ContentType from "../../lib/ContentType";
import { DataInput, DBOutput } from "../../lib/types";
import { Id } from "../../lib/utils/id";

export const updateHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    id: Id,
    data: Partial<DataInput<T>> | DataInput<T>,
  ): Promise<DBOutput<T>> => {
    checkFailureCase("UpdateError");

    try {
      contentType.partialValidate(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DbErrorInvalidData("Invalid data for creation", error.issues);
      }
      throw error;
    }

    if (
      contentType.uniques?.length &&
      contentType.uniques.some((fields) => fields.some((f) => f in data))
    ) {
      try {
        const filter: Record<string, unknown> = {
          $and: [
            { _id: { $ne: parseId(id) } },
            {
              $or: contentType.uniques!.map((fields) => {
                const subFilter: Record<string, unknown> = {};
                fields.forEach((field) => {
                  if (field in data) {
                    const fieldValue = (data as Record<string, unknown>)[field];
                    const fieldSchema = contentType.fields[field];

                    // Si el campo es translatable, necesitamos comparar cada idioma
                    if (
                      fieldSchema &&
                      fieldSchema.getIsTranslatable() &&
                      typeof fieldValue === "object" &&
                      fieldValue !== null
                    ) {
                      // Para campos translatables, creamos condiciones para cada idioma
                      Object.entries(
                        fieldValue as Record<string, unknown>,
                      ).forEach(([lang, value]) => {
                        if (
                          value !== undefined &&
                          value !== null &&
                          value !== ""
                        ) {
                          subFilter[`${field}.${lang}`] = value;
                        }
                      });
                    } else {
                      // Para campos normales, comparación directa
                      subFilter[field] = fieldValue;
                    }
                  }
                });
                return subFilter;
              }),
            },
          ],
        };
        const checkUniques = await db
          .collection(contentType.name)
          .findOne(filter);

        if (checkUniques) {
          throw new DbErrorConflict(
            `Unique constraint violation`,
            `The combination of fields ${contentType.uniques
              .map((fields) => fields.join(", "))
              .join(" or ")} must be unique.`,
          );
        }
      } catch (error) {
        if (error instanceof DbError) throw error;
        throw new DbErrorUnknown(String(error));
      }
    }

    const noNullData = deepDeleteNulls(data) as Partial<DataInput<T>>;

    const nullData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value === null),
    ) as Partial<DataInput<T>>;

    const result = transformObjectIdsToStrings(
      await db.collection(contentType.name).findOneAndUpdate(
        { _id: parseId(id) },
        {
          $set: {
            ...transformStringToObjectIds(noNullData),
            updatedAt: new Date(),
          },
          $unset: nullData,
        },
        { returnDocument: "after" },
      ),
    ) as DBOutput<T> | null;

    if (result === null) {
      throw new DbErrorNotFound("Document not found for update");
    }

    return result;
  };
