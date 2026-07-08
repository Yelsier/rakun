import type { Db } from "mongodb";
import { ZodError } from "zod";

import {
  checkFailureCase,
  type DBMutationOptions,
  DbError,
  DbErrorConflict,
  DbErrorInvalidData,
  DbErrorNotFound,
  DbErrorUnknown,
} from "../dbService";
import type { DBService } from "../dbService";
import { recordContentVersion } from "../versions";
import { parseId } from "../utils/parseId";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import { deepDeleteNulls } from "../utils/deepDeleteNulls";
import ContentType from "../../lib/ContentType";
import { DataInput, DBOutput } from "../../lib/types";
import { Id } from "../../lib/utils/id";
import { getPersistedUniqueGroups } from "../../lib/routeableContent";
import {
  hasContentHooks,
  runAfterUpdateHook,
  runBeforeUpdateHook,
} from "../../api/hooks/runContentHooks";

export const updateHandler =
  (db: Db, getService: () => DBService) =>
  async <T extends ContentType>(
    contentType: T,
    id: Id,
    data: Partial<DataInput<T>> | DataInput<T>,
    options?: DBMutationOptions,
  ): Promise<DBOutput<T>> => {
    checkFailureCase("UpdateError");
    const hookDb = getService();
    const parsedId = parseId(id);
    const versioned = !!contentType.versioning && !options?.skipVersioning;
    const needsPrevious =
      versioned ||
      hasContentHooks(contentType, ["beforeUpdate", "afterUpdate"]);
    const rawBefore = needsPrevious
      ? await db.collection(contentType.name).findOne({ _id: parsedId })
      : null;
    const current = rawBefore
      ? (transformObjectIdsToStrings(rawBefore) as unknown as DBOutput<T>)
      : undefined;
    const effectiveData = await runBeforeUpdateHook({
      db: hookDb,
      contentType,
      id: String(id),
      data,
      current,
      options,
    });

    try {
      contentType.partialValidate(effectiveData);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DbErrorInvalidData("Invalid data for creation", error.issues);
      }
      throw error;
    }

    const uniqueGroups = getPersistedUniqueGroups(
      contentType.name,
      contentType.uniques,
    );

    if (
      uniqueGroups.length &&
      uniqueGroups.some((fields) =>
        fields.some((f) => f in effectiveData),
      )
    ) {
      try {
        const filter: Record<string, unknown> = {
          $and: [
            { _id: { $ne: parseId(id) } },
            {
              $or: uniqueGroups.map((fields) => {
                const subFilter: Record<string, unknown> = {};
                fields.forEach((field) => {
                  if (field in effectiveData) {
                    const fieldValue = (
                      effectiveData as Record<string, unknown>
                    )[field];
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
            `The combination of fields ${uniqueGroups
              .map((fields) => fields.join(", "))
              .join(" or ")} must be unique.`,
          );
        }
      } catch (error) {
        if (error instanceof DbError) throw error;
        throw new DbErrorUnknown(String(error));
      }
    }

    const nextRevision = versioned
      ? Number(rawBefore?._revision ?? 0) + 1
      : undefined;
    const noNullData = deepDeleteNulls(effectiveData) as Partial<DataInput<T>>;

    const nullData = Object.fromEntries(
      Object.entries(effectiveData).filter(([_, value]) => value === null),
    ) as Partial<DataInput<T>>;

    const rawResult = await db.collection(contentType.name).findOneAndUpdate(
      { _id: parsedId },
      {
        $set: {
          ...transformStringToObjectIds(noNullData),
          ...(contentType.schemaVersion
            ? { _schemaVersion: contentType.schemaVersion }
            : {}),
          ...(versioned ? { _revision: nextRevision } : {}),
          updatedAt: new Date(),
        },
        $unset: nullData,
      },
      { returnDocument: "after" },
    );

    const result = transformObjectIdsToStrings(rawResult) as DBOutput<T> | null;

    if (result === null) {
      throw new DbErrorNotFound("Document not found for update");
    }

    if (versioned) {
      await recordContentVersion(db, contentType, {
        operation: "update",
        actorId: options?.actorId,
        reason: options?.reason,
        before: rawBefore,
        after: rawResult,
        revision: nextRevision,
      });
    }

    await runAfterUpdateHook({
      db: hookDb,
      contentType,
      id: String(id),
      document: result,
      previous: current,
      input: effectiveData,
      options,
    });

    return result;
  };
