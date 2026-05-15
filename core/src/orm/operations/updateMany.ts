import type { Db } from "mongodb";
import { ZodError } from "zod";

import {
  checkFailureCase,
  type DBMutationOptions,
  DbError,
  DbErrorConflict,
  DbErrorInvalidData,
  DbErrorUnknown,
} from "../dbService";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import ContentType from "../../lib/ContentType";
import { DataInput, Filter } from "../../lib/types";

export const updateManyHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    filter: Filter<T>,
    data: Partial<DataInput<T>>,
    _options?: DBMutationOptions,
  ): Promise<{ updatedCount: number }> => {
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
        const fullFilter: Record<string, unknown> = {
          $and: [
            // Excluir los documentos que se están actualizando
            { $nor: [transformStringToObjectIds(filter)] },
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
          .findOne(fullFilter);

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

    const noNullData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null),
    ) as Partial<DataInput<T>>;

    const nullData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value === null),
    ) as Partial<DataInput<T>>;

    const result = transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .updateMany(transformStringToObjectIds(filter), {
          $set: {
            ...transformStringToObjectIds(noNullData),
            updatedAt: new Date(),
          },
          $unset: nullData,
        }),
    );

    return { updatedCount: result.modifiedCount };
  };
