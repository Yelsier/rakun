import { DbErrorConflict } from "../../orm/dbService";
import type { DBMutationOptions, DBService } from "../../orm/dbService";
import { LinkedIteratorTemplate } from "../../internal-content-types";
import type ContentType from "../../lib/ContentType";
import { Logger } from "../../lib/Logger";
import {
  ITERATOR_FIELD_NAME,
  ITERATOR_UNLINKED_FIELD_NAME,
} from "../../lib/systemFields";
import type { LinkedIteratorAction } from "../../schemas/manager/linkedIterator";
import { parsePreviewData, serializePreviewData } from "./previewData";
import type { Db } from "mongodb";
import { parseId } from "../../orm/utils/parseId";
import { transformStringToObjectIds } from "../../orm/utils/transformStringToObjectIds";

export type LinkedIteratorDocument = Record<string, unknown> & {
  _id?: string;
};

export type LinkedIteratorTemplateState = {
  configured: boolean;
  iterator?: unknown[];
  revision?: number;
};

const getIteratorField = (contentType: ContentType) =>
  contentType.fields[ITERATOR_FIELD_NAME];

export const validateLinkedIterator = (
  contentType: ContentType,
  value: unknown,
): unknown[] => {
  if (!contentType.linkedIterator || !contentType.hasIterator) {
    throw new Error(
      `Content type "${contentType.name}" does not have a linked iterator.`,
    );
  }

  const parsed = getIteratorField(contentType)?.toZod().parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid iterator for content type "${contentType.name}".`);
  }

  return parsed;
};

export const getLinkedIteratorTemplate = async (
  db: DBService,
  contentType: ContentType,
): Promise<LinkedIteratorTemplateState> => {
  if (!contentType.linkedIterator) {
    return { configured: false };
  }

  const template = await db.find(LinkedIteratorTemplate, {
    contentType: contentType.name,
  });
  if (!template) return { configured: false };

  try {
    return {
      configured: true,
      iterator: validateLinkedIterator(
        contentType,
        parsePreviewData(template.payload),
      ),
      revision: template.revision,
    };
  } catch (error) {
    Logger.error(
      `linkedIterator: invalid template for ${contentType.name}`,
      error as Error,
    );
    return { configured: false };
  }
};

export const getEffectiveIterator = async ({
  db,
  contentType,
  document,
  preferDocument = false,
}: {
  db: DBService;
  contentType: ContentType;
  document: LinkedIteratorDocument;
  preferDocument?: boolean;
}): Promise<unknown[]> => {
  const local = Array.isArray(document[ITERATOR_FIELD_NAME])
    ? (document[ITERATOR_FIELD_NAME] as unknown[])
    : [];

  if (
    !contentType.linkedIterator ||
    document[ITERATOR_UNLINKED_FIELD_NAME] === true ||
    preferDocument
  ) {
    return local;
  }

  const template = await getLinkedIteratorTemplate(db, contentType);
  return template.iterator ?? local;
};

export const applyEffectiveIterator = async <T extends LinkedIteratorDocument>({
  db,
  contentType,
  document,
  preferDocument,
}: {
  db: DBService;
  contentType: ContentType;
  document: T;
  preferDocument?: boolean;
}): Promise<T> => {
  if (!contentType.linkedIterator) return document;

  return {
    ...document,
    [ITERATOR_FIELD_NAME]: await getEffectiveIterator({
      db,
      contentType,
      document,
      preferDocument,
    }),
  };
};

export const saveLinkedIteratorTemplate = async ({
  action,
  contentType,
  db,
  expectedRevision,
  iterator,
  options,
}: {
  action: LinkedIteratorAction;
  contentType: ContentType;
  db: DBService;
  expectedRevision?: number;
  iterator: unknown;
  options?: DBMutationOptions;
}): Promise<LinkedIteratorTemplateState> => {
  const value = validateLinkedIterator(contentType, iterator);
  const current = await db.find(LinkedIteratorTemplate, {
    contentType: contentType.name,
  });

  if (action === "initialize") {
    if (current) {
      throw new DbErrorConflict(
        `The linked iterator for "${contentType.name}" is already initialized.`,
      );
    }

    const created = await db.create(
      LinkedIteratorTemplate,
      {
        _type: LinkedIteratorTemplate.name,
        contentType: contentType.name,
        payload: serializePreviewData(value),
        revision: 1,
        createdBy: options?.actorId,
        updatedBy: options?.actorId,
      },
      options,
    );

    await tryMaterializeLinkedIterator({
      contentType,
      db,
      iterator: value,
      options,
    });

    return {
      configured: true,
      iterator: value,
      revision: created.revision,
    };
  }

  if (!current) {
    throw new DbErrorConflict(
      `The linked iterator for "${contentType.name}" has not been initialized.`,
    );
  }

  if (
    expectedRevision === undefined ||
    current.revision !== expectedRevision
  ) {
    throw new DbErrorConflict(
      `The linked iterator for "${contentType.name}" was modified by another user.`,
    );
  }

  const revision = current.revision + 1;
  const rawDb = db.rawDB as Partial<Db> | undefined;
  if (rawDb?.collection) {
    const updated = await rawDb
      .collection(LinkedIteratorTemplate.name)
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
        `The linked iterator for "${contentType.name}" was modified by another user.`,
      );
    }
  } else {
    await db.update(
      LinkedIteratorTemplate,
      current._id,
      {
        payload: serializePreviewData(value),
        revision,
        updatedBy: options?.actorId,
      },
      options,
    );
  }

  await tryMaterializeLinkedIterator({
    contentType,
    db,
    iterator: value,
    options,
  });

  return { configured: true, iterator: value, revision };
};

export const materializeLinkedIterator = async ({
  contentType,
  db,
  iterator,
  options,
}: {
  contentType: ContentType;
  db: DBService;
  iterator: unknown[];
  options?: DBMutationOptions;
}) => {
  await db.updateMany(
    contentType,
    {
      [ITERATOR_UNLINKED_FIELD_NAME]: { $ne: true },
    } as never,
    {
      [ITERATOR_FIELD_NAME]: iterator,
      updatedBy: options?.actorId,
    } as never,
    {
      ...options,
      reason: options?.reason ?? "linked iterator synchronization",
      skipVersioning: true,
    },
  );
};

const tryMaterializeLinkedIterator = async (
  args: Parameters<typeof materializeLinkedIterator>[0],
) => {
  try {
    await materializeLinkedIterator(args);
  } catch (error) {
    Logger.error(
      `linkedIterator: could not materialize ${args.contentType.name}`,
      error as Error,
    );
  }
};

export const isIteratorUnlinked = (document: LinkedIteratorDocument) =>
  document[ITERATOR_UNLINKED_FIELD_NAME] === true;
