import { ObjectId } from "mongodb";
import { Media } from "../../../internal-content-types";
import ContentType from "../../../lib/ContentType";
import { getContentTypeByName } from "../../../lib/Registry";
import { DBOutput, DataPopulated } from "../../../lib/types";
import { hasKeys } from "../../../lib/utils/hasKeys";
import { getMediaService } from "../../../media";
import { getMongoService } from "../../../orm";

/**
 *
 * @param data - The raw database output for a content item, which may include relation references.
 * @returns  A new object with all relation references resolved to their full populated data, suitable for API output.
 *
 * This function recursively traverses the input data, looking for relation references (objects with a "type" of "existing" or "new"). For "existing" relations, it fetches the related content from the database and replaces the reference with the full populated object. For "new" relations, it processes the provided data as if it were a new content item, assigning it a temporary _id. The function also handles special cases like file fields pointing to Media items, resolving them to include the media URL and metadata. The final output is a fully populated object with all relations resolved, ready for API consumption.
 * @example
 * const rawData = {
 *   title: 'Example Title',
 *   author: { type: 'existing', _id: '123', contentType: 'Author' },
 *   media: { type: 'existing', _id: '456', contentType: 'Media' }
 * }
 * const populatedData = await populateRelations(rawData)
 * console.log(populatedData)
 * // Output might look like:
 * // {
 * //   title: 'Example Title',
 * //   author: { _id: '123', name: 'John Doe' },
 * //   media: { url: 'https://example.com/media.jpg', name: 'Media Name', mime: 'image/jpeg' }
 * // }
 */
export function populateRelations<T extends ContentType>(
  data: DBOutput<T>,
): Promise<DataPopulated<T>>;
export function populateRelations<T extends ContentType>(
  data: DBOutput<T>[],
): Promise<DataPopulated<T>[]>;
export async function populateRelations<T extends ContentType>(
  data: DBOutput<T> | DBOutput<T>[],
): Promise<DataPopulated<T> | DataPopulated<T>[]> {
  const db = await getMongoService();

  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => populateRelations(item)));
  }

  const currentContentType =
    typeof data?._type === "string" ? getContentTypeByName(data._type) : null;

  // Recursively populate arrays, translatable maps, relations, and nested objects.
  const populateValue = async (
    value: unknown,
    fieldName?: string,
  ): Promise<unknown> => {
    // Keep array order but resolve each element concurrently.
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => populateValue(v, fieldName)));
    }

    // Translatable fields store values per language plus the _tag marker.
    if (hasKeys(value) && value._tag === "Translatable") {
      const entries = Object.entries(value);
      const populatedEntries = await Promise.all(
        entries.map(async ([k, v]) => {
          if (k === "_tag") return [k, v];
          return [k, await populateValue(v, fieldName)];
        }),
      );

      return Object.fromEntries(populatedEntries);
    }

    if (value && typeof value === "object" && "type" in value) {
      // Resolve existing relations from the DB and continue recursively.
      if (
        value.type === "existing" &&
        "_id" in value &&
        "contentType" in value
      ) {
        const _id = value._id as string;
        const contentTypeName = value.contentType as string;
        const isFileField =
          !!fieldName &&
          (currentContentType?.fields?.[fieldName]?.getConfig().type as
            | string
            | undefined) === "File";

        // File fields pointing to Media are projected to API output shape.
        if (isFileField && contentTypeName === "Media") {
          try {
            const media = await db.get(Media, _id);
            const mediaService = getMediaService();
            const [resolved, resolvedPreview] = await Promise.all([
              mediaService
                .getMediaUrl({
                  key: media.key,
                  access: media.access,
                })
                .catch(() => null),
              media.previewKey
                ? mediaService
                    .getMediaUrl({
                      key: media.previewKey,
                      access: media.access,
                    })
                    .catch(() => null)
                : Promise.resolve(null),
            ]);

            return {
              url: resolved?.url || media.url || "",
              previewUrl: resolvedPreview?.url || media.previewUrl || null,
              name: media.name || "",
              mime: media.mime || "",
              width: media.width ?? null,
              height: media.height ?? null,
              size: media.size ?? 0,
              orientation: media.orientation ?? null,
            };
          } catch (_) {
            return {
              url: "",
              previewUrl: null,
              name: "",
              mime: "",
              width: null,
              height: null,
              size: 0,
              orientation: null,
            };
          }
        }

        return db
          .get(getContentTypeByName(contentTypeName), _id)
          .then((populated) => {
            // Keep original value if the target no longer exists.
            if (!populated) return Promise.resolve(value);
            return populateRelations(
              populated as DBOutput<T>,
            ) as Promise<unknown>;
          });
      }

      // Inline "new" relation payloads as fully populated objects.
      if (value.type === "new" && "data" in value) {
        const data = value.data as DBOutput<T>;
        return {
          ...(await populateRelations(data)),
          _id: new ObjectId().toString(),
        };
      }
    }

    // Traverse plain objects so deeply nested relation values are handled too.
    if (hasKeys(value)) {
      const entries = Object.entries(value);
      const populatedEntries = await Promise.all(
        entries.map(async ([k, v]) => [k, await populateValue(v)] as const),
      );

      return Object.fromEntries(populatedEntries);
    }

    // Primitive values are returned as-is.
    return Promise.resolve(value);
  };

  // Populate each top-level field concurrently, preserving original keys.
  const entries = Object.entries(data);
  const populatedValues = await Promise.all(
    entries.map(([k, v]) => populateValue(v, k)),
  );

  // Filter out createdBy and updatedBy fields since they are only for internal use and not part of the public API output.
  const result = Object.fromEntries(
    entries.flatMap(([k], i) =>
      k === "createdBy" || k === "updatedBy" ? [] : [[k, populatedValues[i]]],
    ),
  );

  return result as DataPopulated<T>;
}
