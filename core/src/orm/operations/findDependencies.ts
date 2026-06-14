import type { Db } from "mongodb";

import { checkFailureCase, DbErrorUnknown } from "../dbService";
import { parseId } from "../utils/parseId";
import { getMongoDB } from "../mongodbPeer";
import ContentType from "../../lib/ContentType";
import { Id } from "../../lib/utils/id";
import { getContentTypes } from "../../lib/Registry";

const passiveDependencyContentTypes = new Set([
  "BackupDocument",
  "ContentVersion",
  "PreviewSnapshot",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object";

const isObjectIdLike = (
  value: unknown,
  ObjectId: ReturnType<typeof getMongoDB>["ObjectId"],
) => value instanceof ObjectId;

const idMatches = (
  value: unknown,
  targetId: string,
  ObjectId: ReturnType<typeof getMongoDB>["ObjectId"],
) => {
  if (isObjectIdLike(value, ObjectId)) {
    return value.toString() === targetId;
  }

  return typeof value === "string" && value === targetId;
};

const hasTargetDependency = ({
  currentContentType,
  ObjectId,
  targetContentType,
  targetId,
  value,
}: {
  currentContentType: string;
  ObjectId: ReturnType<typeof getMongoDB>["ObjectId"];
  targetContentType: string;
  targetId: string;
  value: unknown;
}): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) =>
      hasTargetDependency({
        currentContentType,
        ObjectId,
        targetContentType,
        targetId,
        value: item,
      }),
    );
  }

  if (!isRecord(value)) return false;

  if (value._tag === "Translatable") {
    return Object.entries(value).some(([key, nested]) => {
      if (key === "_tag") return false;

      return hasTargetDependency({
        currentContentType,
        ObjectId,
        targetContentType,
        targetId,
        value: nested,
      });
    });
  }

  const relationType = value.type;
  if (
    (relationType === "existing" || relationType === "self") &&
    idMatches(value._id, targetId, ObjectId)
  ) {
    const relationContentType =
      typeof value.contentType === "string"
        ? value.contentType
        : relationType === "self"
          ? currentContentType
          : undefined;

    if (relationContentType === targetContentType) {
      return true;
    }
  }

  if (
    typeof value.contentType === "string" &&
    value.contentType === targetContentType &&
    idMatches(value.moduleId, targetId, ObjectId)
  ) {
    return true;
  }

  return Object.values(value).some((nested) =>
    hasTargetDependency({
      currentContentType,
      ObjectId,
      targetContentType,
      targetId,
      value: nested,
    }),
  );
};

/**
 *
 * @param db database instance
 * @param contentType the content type of the item being checked for dependencies
 * @param id the ID of the item being checked for dependencies
 * @returns a list of content type and ID pairs that reference the given item via relation-shaped values or module slots
 * @example
 * // Find dependencies for an Article with ID '123'
 * const dependencies = await findDependenciesHandler(db)(getContentTypeByName('Article'), '123')
 * console.log(dependencies)
 * // Output might look like:
 * // [
 * //   { contentType: 'Author', _id: '456' },
 * //   { contentType: 'Article', _id: '321' }
 * // ]
 * // This indicates that there is an Author referencing the Article and another Article that has a SelfRelation to it.
 */
export const findDependenciesHandler =
  (db: Db) =>
  async <T extends ContentType>(
    contentType: T,
    id: Id,
  ): Promise<Array<{ contentType: string; _id: Id }>> => {
    checkFailureCase("FoundError");
    const { ObjectId } = getMongoDB();
    const parsedId = parseId(id);
    const parsedIdString = parsedId.toString();

    const otherContentTypes = Array.from(
      new Set(
        getContentTypes()
          .map((ct) => ct.name)
          .filter((name) => !passiveDependencyContentTypes.has(name)),
      ),
    );

    const finds = await Promise.all(
      otherContentTypes.map(async (name) => {
        try {
          const items = await db
            .collection(name)
            .find({})
            .toArray();

          // Return minimal dependency metadata used by delete conflict handling.
          return items
            .filter((item) =>
              hasTargetDependency({
                currentContentType: name,
                ObjectId,
                targetContentType: contentType.name,
                targetId: parsedIdString,
                value: item,
              }),
            )
            .map((item) => ({
              contentType: name,
              _id: item._id.toString(),
            }));
        } catch (error) {
          throw new DbErrorUnknown(String(error));
        }
      }),
    );

    return finds.flat();
  };
