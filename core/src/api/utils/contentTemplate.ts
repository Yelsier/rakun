import type { Db } from "mongodb";

import { ContentTemplate, TemplateContent } from "../../internal-content-types";
import type ContentType from "../../lib/ContentType";
import type { AnyField } from "../../lib/fields/Field";
import { Logger } from "../../lib/Logger";
import { ITERATOR_FIELD_NAME } from "../../lib/systemFields";
import type { DBMutationOptions, DBService } from "../../orm/dbService";
import { DbErrorConflict } from "../../orm/dbService";
import { transformStringToObjectIds } from "../../orm/utils/transformStringToObjectIds";
import { parseId } from "../../orm/utils/parseId";
import { parsePreviewData, serializePreviewData } from "./previewData";

export type ContentTemplateState = {
  configured: boolean;
  modules?: unknown[];
  revision?: number;
};

export class ContentTemplateValidationError extends Error {}

export const createTemplateContentSlot = () => ({
  name: TemplateContent.name,
  value: {
    type: "new" as const,
    data: { _type: TemplateContent.name },
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date);

export const isTemplateContentSlot = (value: unknown) => {
  if (!isRecord(value) || value.name !== TemplateContent.name) return false;

  const itemValue = value.value;
  if (!isRecord(itemValue)) return false;

  if (itemValue._type === TemplateContent.name) return true;

  return (
    itemValue.type === "new" &&
    isRecord(itemValue.data) &&
    itemValue.data._type === TemplateContent.name
  );
};

const visitTemplateSlotsInContentType = (
  contentType: ContentType,
  value: unknown,
): number => {
  if (!isRecord(value)) return 0;

  return Object.entries(contentType.fields).reduce(
    (count, [key, field]) =>
      count + visitTemplateSlotsInField(field, value[key]),
    0,
  );
};

const visitTemplateSlotsInField = (field: AnyField, value: unknown): number => {
  if (
    (field.meta.ui === "List" || field.meta.ui === "Iterator") &&
    "fields" in field &&
    Array.isArray(field.fields)
  ) {
    if (!Array.isArray(value)) return 0;
    const entries = field.fields as Array<{ name: string; field: AnyField }>;

    return value.reduce((count, item) => {
      if (isTemplateContentSlot(item)) return count + 1;
      if (!isRecord(item) || typeof item.name !== "string") return count;

      const entry = entries.find(
        (candidate: { name: string }) => candidate.name === item.name,
      ) as { field: AnyField } | undefined;

      return count + (entry ? visitTemplateSlotsInField(entry.field, item.value) : 0);
    }, 0);
  }

  if (
    field.meta.ui === "SimpleList" &&
    "field" in field &&
    Array.isArray(value)
  ) {
    return value.reduce(
      (count, item) => count + visitTemplateSlotsInField(field.field as AnyField, item),
      0,
    );
  }

  if (
    field.meta.ui === "ContentType" &&
    "contentType" in field &&
    isRecord(value) &&
    value.type === "new" &&
    isRecord(value.data)
  ) {
    return visitTemplateSlotsInContentType(
      field.contentType as ContentType,
      value.data,
    );
  }

  return 0;
};

export const stripTemplateContentSlots = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      isTemplateContentSlot(item) ? [] : [stripTemplateContentSlots(item)],
    );
  }

  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      stripTemplateContentSlots(item),
    ]),
  );
};

const mergeTemplateSlots = (raw: unknown, parsed: unknown): unknown => {
  if (Array.isArray(raw) && Array.isArray(parsed)) {
    let parsedIndex = 0;
    return raw.map((item) => {
      if (isTemplateContentSlot(item)) return createTemplateContentSlot();

      const parsedItem = parsed[parsedIndex++];
      return mergeTemplateSlots(item, parsedItem);
    });
  }

  if (isRecord(raw) && isRecord(parsed)) {
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [
        key,
        mergeTemplateSlots(raw[key], item),
      ]),
    );
  }

  return parsed;
};

export const validateContentTemplate = (
  contentType: ContentType,
  modules: unknown,
): unknown[] => {
  if (!contentType.hasTemplate || !contentType.hasIterator) {
    throw new ContentTemplateValidationError(
      `Content type "${contentType.name}" does not have a template.`,
    );
  }

  const templateField = contentType.fields[ITERATOR_FIELD_NAME];
  const slotCount = visitTemplateSlotsInField(templateField, modules);

  if (slotCount !== 1) {
    throw new ContentTemplateValidationError(
      `The template for "${contentType.name}" must contain exactly one Content slot.`,
    );
  }

  const parsed = templateField
    .getSchema()
    .parse(stripTemplateContentSlots(modules));
  const normalized = mergeTemplateSlots(modules, parsed);

  if (!Array.isArray(normalized)) {
    throw new ContentTemplateValidationError(
      `The template for "${contentType.name}" is invalid.`,
    );
  }

  return normalized;
};

export const getContentTemplate = async (
  db: DBService,
  contentType: ContentType,
): Promise<ContentTemplateState> => {
  if (!contentType.hasTemplate) return { configured: false };

  const template = await db.find(ContentTemplate, {
    contentType: contentType.name,
  });
  if (!template) return { configured: false };

  try {
    return {
      configured: true,
      modules: validateContentTemplate(
        contentType,
        parsePreviewData(template.payload),
      ),
      revision: template.revision,
    };
  } catch (error) {
    Logger.error(
      `contentTemplate: invalid template for ${contentType.name}`,
      error as Error,
    );
    return { configured: false };
  }
};

export const saveContentTemplate = async ({
  contentType,
  db,
  expectedRevision,
  modules,
  options,
}: {
  contentType: ContentType;
  db: DBService;
  expectedRevision?: number;
  modules: unknown;
  options?: DBMutationOptions;
}): Promise<ContentTemplateState> => {
  const value = validateContentTemplate(contentType, modules);
  const current = await db.find(ContentTemplate, {
    contentType: contentType.name,
  });

  if (!current) {
    const created = await db.create(
      ContentTemplate,
      {
        _type: ContentTemplate.name,
        contentType: contentType.name,
        payload: serializePreviewData(value),
        revision: 1,
        createdBy: options?.actorId,
        updatedBy: options?.actorId,
      },
      options,
    );

    return { configured: true, modules: value, revision: created.revision };
  }

  if (expectedRevision === undefined || current.revision !== expectedRevision) {
    throw new DbErrorConflict(
      `The template for "${contentType.name}" was modified by another user.`,
    );
  }

  const revision = current.revision + 1;
  const rawDb = db.rawDB as Partial<Db> | undefined;
  if (rawDb?.collection) {
    const updated = await rawDb
      .collection(ContentTemplate.name)
      .findOneAndUpdate(
        {
          _id: parseId(current._id),
          revision: expectedRevision,
        },
        {
          $set: transformStringToObjectIds({
            payload: serializePreviewData(value),
            revision,
            updatedBy: options?.actorId,
            updatedAt: new Date(),
          }),
        },
        { returnDocument: "after" },
      );

    if (!updated) {
      throw new DbErrorConflict(
        `The template for "${contentType.name}" was modified by another user.`,
      );
    }
  } else {
    await db.update(
      ContentTemplate,
      current._id,
      {
        payload: serializePreviewData(value),
        revision,
        updatedBy: options?.actorId,
      },
      options,
    );
  }

  return { configured: true, modules: value, revision };
};

export const applyContentTemplate = (
  templateModules: unknown[],
  contentModules: unknown[],
): unknown[] => {
  const expand = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.flatMap((item) =>
        isTemplateContentSlot(item)
          ? contentModules.map((module) => structuredClone(module))
          : [expand(item)],
      );
    }

    if (!isRecord(value)) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, expand(item)]),
    );
  };

  const expanded = expand(templateModules);
  return Array.isArray(expanded) ? expanded : contentModules;
};
