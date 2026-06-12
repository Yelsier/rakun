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
import { transformStringToObjectIds } from "../utils/transformStringToObjectIds";
import { transformObjectIdsToStrings } from "../utils/transformObjectIdsToStrings";
import { deepDeleteNulls } from "../utils/deepDeleteNulls";
import ContentType from "../../lib/ContentType";
import { DataInput, DBOutput } from "../../lib/types";
import {
  runAfterInsertHook,
  runBeforeInsertHook,
} from "../../api/hooks/runContentHooks";

export const createHandler =
  (db: Db, getService: () => DBService) =>
  async <T extends ContentType>(
    contentType: T,
    data: DataInput<T>,
    options?: DBMutationOptions,
  ): Promise<DBOutput<T>> => {
    checkFailureCase("CreationError");
    const hookDb = getService();
    const effectiveData = await runBeforeInsertHook({
      db: hookDb,
      contentType,
      data,
      options,
    });

    try {
      contentType.validate(effectiveData);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new DbErrorInvalidData("Invalid data for creation", error.issues);
      }
      throw error;
    }

    if (contentType.uniques?.length) {
      try {
        const filter: Record<string, unknown> = {
          $or: contentType.uniques!.map((fields) => {
            const subFilter: Record<string, unknown> = {};
            fields.forEach((field) => {
              const fieldValue = (effectiveData as Record<string, unknown>)[
                field
              ];
              const fieldSchema = contentType.fields[field];

              // Si el campo es translatable, necesitamos comparar cada idioma
              if (
                fieldSchema &&
                fieldSchema.getIsTranslatable() &&
                typeof fieldValue === "object" &&
                fieldValue !== null
              ) {
                // Para campos translatables, creamos condiciones para cada idioma
                Object.entries(fieldValue as Record<string, unknown>).forEach(
                  ([lang, value]) => {
                    if (value !== undefined && value !== null && value !== "") {
                      subFilter[`${field}.${lang}`] = value;
                    }
                  },
                );
              } else {
                // Para campos normales, comparación directa
                subFilter[field] = fieldValue;
              }
            });
            return subFilter;
          }),
        };
        const checkUniques = await db
          .collection(contentType.name)
          .findOne(filter);

        if (checkUniques) {
          throw new DbErrorConflict(
            `Unique constraint violation`,
            `The combination of fields ${contentType.uniques
              .map((fields) => fields.join(", "))
              .join(" or ")} must be unique. CT: ${contentType.name}`,
          );
        }
      } catch (error) {
        if (error instanceof DbError) throw error;
        throw new DbErrorUnknown(String(error));
      }
    }

    const versioned = !!contentType.versioning && !options?.skipVersioning;
    const metadata = {
      ...(contentType.schemaVersion
        ? { _schemaVersion: contentType.schemaVersion }
        : {}),
      ...(contentType.documentVisibility
        ? {
            _visibility:
              (effectiveData as Record<string, unknown>)._visibility ?? "draft",
          }
        : {}),
      ...(versioned ? { _revision: 1 } : {}),
    };
    const noNullData = deepDeleteNulls({
      ...effectiveData,
      ...metadata,
    }) as DataInput<T>;

    const result = await db.collection(contentType.name).insertOne(
      {
        ...transformStringToObjectIds(noNullData),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        writeConcern: { w: "majority" },
      },
    );

    const document = transformObjectIdsToStrings(
      await db
        .collection(contentType.name)
        .findOne<DBOutput<T>>({ _id: result.insertedId }),
    );

    if (!document) {
      throw new DbErrorNotFound("Document not found after creation");
    }

    if (versioned) {
      await recordContentVersion(db, contentType, {
        operation: "create",
        actorId: options?.actorId,
        reason: options?.reason,
        before: null,
        after: transformStringToObjectIds(document) as Record<
          string,
          unknown
        >,
        revision: 1,
      });
    }

    await runAfterInsertHook({
      db: hookDb,
      contentType,
      document,
      input: effectiveData,
      options,
    });

    return document;
  };
