import { ObjectId, type Db } from "mongodb";

import { checkFailureCase, DbErrorUnknown } from "../dbService";
import { parseId } from "../utils/parseId";
import { Field } from "../../lib/fields/Field";
import ContentType from "../../lib/ContentType";
import { RelationField } from "../../lib/fields/Relation";
import { Id } from "../../lib/utils/id";
import { getContentTypes } from "../../lib/Registry";

const isRelationFieldAndTarget = (field: Field, contentType: string) =>
  field.getConfig().ui === "ContentType" &&
  (field as RelationField<ContentType>).contentType.name === contentType;

const isFileFieldAndTarget = (field: Field, contentType: string) =>
  field.getConfig().type === "File" && contentType === "Media";

const isSelfRelationFieldAndSameTarget = (
  field: Field,
  thisContentType: string,
  targetContentType: string,
) =>
  field.getConfig().ui === "SelfRelation" &&
  thisContentType === targetContentType;

/**
 *
 * @param db database instance
 * @param contentType the content type of the item being checked for dependencies
 * @param id the ID of the item being checked for dependencies
 * @returns a list of content type and ID pairs that reference the given item via Relation, File, or SelfRelation fields
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
    const parsedId = parseId(id);
    const parsedIdString = parsedId.toString();
    const hasTargetId = (value: unknown): boolean => {
      if (Array.isArray(value)) {
        return value.some((item) => hasTargetId(item));
      }

      if (!value || typeof value !== "object") return false;

      const maybeRelation = value as { _id?: unknown };
      if (maybeRelation._id instanceof ObjectId) {
        return maybeRelation._id.toString() === parsedIdString;
      }
      if (typeof maybeRelation._id === "string") {
        return maybeRelation._id === parsedIdString;
      }

      const maybeTranslatable = value as Record<string, unknown>;
      if (maybeTranslatable._tag === "Translatable") {
        return Object.entries(maybeTranslatable).some(([key, nested]) => {
          if (key === "_tag") return false;
          return hasTargetId(nested);
        });
      }

      return false;
    };

    // Collect content types that can reference the target type via Relation/File/SelfRelation fields.
    const otherContentTypes = getContentTypes()
      .filter((ct) =>
        Object.entries(ct.fields).some(
          ([_, field]) =>
            isRelationFieldAndTarget(field, contentType.name) ||
            isFileFieldAndTarget(field, contentType.name) ||
            isSelfRelationFieldAndSameTarget(field, ct.name, contentType.name),
        ),
      )
      .map((ct) => ({
        name: ct.name,
        fields: Object.entries(ct.fields)
          .filter(
            ([_, field]) =>
              isRelationFieldAndTarget(field, contentType.name) ||
              isFileFieldAndTarget(field, contentType.name) ||
              isSelfRelationFieldAndSameTarget(
                field,
                ct.name,
                contentType.name,
              ),
          )
          .map(([fieldName]) => fieldName),
      }));

    const finds = await Promise.all(
      otherContentTypes.map(async ({ name, fields }) => {
        try {
          // Query direct refs and translatable containers, then verify exact _id in-memory.
          const fieldFilters = fields.flatMap((field) => [
            { [`${field}._id`]: parsedId },
            { [`${field}._tag`]: "Translatable" },
          ]);

          const items = await db
            .collection(name)
            .find({
              $or: fieldFilters,
            })
            .toArray();

          // Return minimal dependency metadata used by delete conflict handling.
          return items
            .filter((item) => fields.some((field) => hasTargetId(item[field])))
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
