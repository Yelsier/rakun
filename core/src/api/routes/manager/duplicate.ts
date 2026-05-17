import type ContentType from "../../../lib/ContentType";
import type { AnyField } from "../../../lib/fields/Field";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import type { DuplicateInput } from "../../../schemas/manager/duplicate";
import type { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import { createHandler } from "./create";

const COPY_SUFFIX = "-copy";

const SYSTEM_DUPLICATE_FIELDS = new Set([
  "_id",
  "_revision",
  "_trashed",
  "_visibilityBeforeTrash",
  "createdAt",
  "createdBy",
  "trashedAt",
  "trashedBy",
  "updatedAt",
  "updatedBy",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isTranslatableRecord = (
  value: unknown,
): value is Record<string, unknown> & { _tag: "Translatable" } =>
  isRecord(value) && value._tag === "Translatable";

const cloneRecord = (value: Record<string, unknown>) =>
  structuredClone(value) as Record<string, unknown>;

const withCopySuffix = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.length > 0 ? `${value}${COPY_SUFFIX}` : value;
  }

  if (isTranslatableRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "_tag" ? item : withCopySuffix(item),
      ]),
    );
  }

  return value;
};

const isSlugField = (field: AnyField) => {
  const config = field.getConfig();
  return config.type === "String" && config.ui === "Slug";
};

const isTitleField = (fieldName: string, field: AnyField) => {
  const config = field.getConfig();
  return fieldName.toLowerCase() === "title" && config.type === "String";
};

const getCopySuffixFieldNames = (contentType: ContentType) => {
  const uniqueFieldNames = new Set(contentType.uniques.flat());

  return Object.entries(contentType.fields)
    .filter(
      ([fieldName, field]) =>
        (uniqueFieldNames.has(fieldName) && isSlugField(field)) ||
        isTitleField(fieldName, field),
    )
    .map(([fieldName]) => fieldName);
};

const createDuplicateData = (
  contentType: ContentType,
  source: Record<string, unknown>,
) => {
  const data = cloneRecord(source);

  SYSTEM_DUPLICATE_FIELDS.forEach((fieldName) => {
    delete data[fieldName];
  });

  if (contentType.documentVisibility) {
    data._visibility = "draft";
  } else {
    delete data._visibility;
  }

  data._type = contentType.name;

  getCopySuffixFieldNames(contentType).forEach((fieldName) => {
    if (fieldName in data) {
      data[fieldName] = withCopySuffix(data[fieldName]);
    }
  });

  return data;
};

export const duplicateHandler = async ({
  input,
  ctx,
}: {
  input: DuplicateInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, id } = input;
  const contentType = requireContentType(contentTypeName);

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "readAny",
  });

  const source = (await db.get(contentType, id)) as Record<string, unknown>;
  const data = createDuplicateData(contentType, source);

  Logger.addTrace("manager.duplicate: duplicate data prepared", {
    contentType: contentType.name,
    id,
  });

  return createHandler({
    input: {
      contentType: contentType.name,
      data,
    },
    ctx,
  });
};
