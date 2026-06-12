import { getRakunBootstrapOptions } from "../../bootstrapState";
import type ContentType from "../../lib/ContentType";
import {
  DYNAMIC_BINDINGS_FIELD_NAME,
  getDynamicDocumentBindings,
  isDynamicDataSourceContentTypeAllowed,
  type DynamicBindingSource,
  type DynamicListBinding,
} from "../../lib/dynamicData";
import { Logger } from "../../lib/Logger";
import type { DataPopulatedWithoutApiOnly, DBOutput, Query } from "../../lib/types";
import { getContentTypeByName } from "../../lib/Registry";
import type { DBService } from "../../orm/dbService";
import { runOnGetHook } from "../hooks/runContentHooks";
import { getLink } from "./getLink";
import { populateLinks } from "./populates/populateLinks";
import { populateRelations } from "./populates/populateRelations";
import { parseSafeManagerQuery } from "./safeManagerQuery";

type ResolveOptions = {
  db: DBService;
  contentType?: ContentType;
  surface: "web" | "preview";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const getAtPath = (value: unknown, path: string | undefined) => {
  if (!path) return undefined;

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) return undefined;
    return current[segment];
  }, value);
};

const isPublicDocument = (value: Record<string, unknown>) =>
  value._trashed !== true &&
  value._visibility !== "draft" &&
  value._visibility !== "trash";

const isSourceContentTypeAllowed = (
  ownerContentType: ContentType,
  sourceContentTypeName: string,
) =>
  isDynamicDataSourceContentTypeAllowed(
    ownerContentType.dynamicData,
    getContentTypeByName(sourceContentTypeName),
  );

const getRouteKeyForSource = (
  contentTypeName: string,
  routeKey?: string,
): string | undefined => {
  if (routeKey) return routeKey;

  return getRakunBootstrapOptions()?.routes?.find(
    (route) => route.contentType === contentTypeName && route.hasPage,
  )?.key;
};

const resolveHref = async (
  source: DynamicBindingSource,
  sourceId: string,
): Promise<unknown> => {
  const routeKey = getRouteKeyForSource(source.contentType, source.routeKey);
  if (!routeKey) return undefined;

  return await getLink(routeKey, sourceId);
};

const loadSourceDocument = async (
  db: DBService,
  source: DynamicBindingSource,
): Promise<Record<string, unknown> | undefined> => {
  if (!source.id) return undefined;

  const contentType = getContentTypeByName(source.contentType);
  if (!contentType) return undefined;

  const item = await db.get(contentType, source.id).catch(() => undefined);
  if (!item || !isPublicDocument(item as Record<string, unknown>)) {
    return undefined;
  }

  return (await populateRelations(
    await populateLinks(item as DBOutput<ContentType>),
  )) as Record<string, unknown>;
};

const resolveSourceValue = async ({
  db,
  ownerContentType,
  source,
  currentSource,
}: {
  db: DBService;
  ownerContentType: ContentType;
  source: DynamicBindingSource;
  currentSource?: Record<string, unknown>;
}) => {
  if (!isSourceContentTypeAllowed(ownerContentType, source.contentType)) {
    return undefined;
  }

  const sourceDocument =
    currentSource ?? (await loadSourceDocument(db, source));
  if (!sourceDocument) return undefined;

  if (source.virtual === "href") {
    const sourceId =
      typeof sourceDocument._id === "string" ? sourceDocument._id : source.id;
    return sourceId ? await resolveHref(source, sourceId) : undefined;
  }

  return getAtPath(sourceDocument, source.path);
};

const addPublicContentFilter = (query: Query): Query => ({
  ...query,
  filter: {
    ...query.filter,
    _trashed: { $ne: true },
    _visibility: { $nin: ["draft", "trash"] },
  },
});

const resolveListBinding = async ({
  db,
  ownerContentType,
  binding,
}: {
  db: DBService;
  ownerContentType: ContentType;
  binding: DynamicListBinding;
}) => {
  if (!isSourceContentTypeAllowed(ownerContentType, binding.contentType)) {
    return undefined;
  }

  const sourceContentType = getContentTypeByName(binding.contentType);
  if (!sourceContentType) return undefined;

  const query = addPublicContentFilter(
    parseSafeManagerQuery(sourceContentType, binding.query ?? {}),
  );
  const sourceItems = (await db.list(sourceContentType, query)).items;

  return await Promise.all(
    sourceItems.map(async (sourceItem, index) => {
      const populated = (await populateRelations(
        await populateLinks(sourceItem as DBOutput<ContentType>),
      )) as Record<string, unknown>;
      const mapped = Object.fromEntries(
        await Promise.all(
          Object.entries(binding.map).map(async ([targetField, source]) => [
            targetField,
            await resolveSourceValue({
              db,
              ownerContentType,
              source,
              currentSource: populated,
            }),
          ]),
        ),
      );

      return {
        name: binding.itemName,
        value: {
          _id:
            typeof sourceItem._id === "string"
              ? `${binding.itemName}:${sourceItem._id}`
              : `${binding.itemName}:${index}`,
          _type: binding.itemName,
          ...mapped,
        },
      };
    }),
  );
};

const resolveRecordBindings = async ({
  db,
  contentType,
  value,
}: {
  db: DBService;
  contentType: ContentType;
  value: Record<string, unknown>;
}) => {
  const bindings = getDynamicDocumentBindings(
    value[DYNAMIC_BINDINGS_FIELD_NAME],
  );
  if (!bindings) return value;

  const next = { ...value };

  for (const [field, source] of Object.entries(bindings.fields ?? {})) {
    try {
      const resolved = await resolveSourceValue({
        db,
        ownerContentType: contentType,
        source,
      });
      if (resolved !== undefined) {
        next[field] = resolved;
      }
    } catch (error) {
      Logger.error("dynamicData: field binding failed", error as Error);
    }
  }

  for (const [field, binding] of Object.entries(bindings.lists ?? {})) {
    try {
      const resolved = await resolveListBinding({
        db,
        ownerContentType: contentType,
        binding,
      });
      if (resolved !== undefined) {
        next[field] = resolved;
      }
    } catch (error) {
      Logger.error("dynamicData: list binding failed", error as Error);
    }
  }

  return next;
};

export const resolveDynamicData = async <T>(
  value: T,
  options: ResolveOptions,
): Promise<T> => {
  if (Array.isArray(value)) {
    return (await Promise.all(
      value.map((item) => resolveDynamicData(item, options)),
    )) as T;
  }

  if (!isRecord(value)) return value;

  const contentType =
    options.contentType ??
    (typeof value._type === "string"
      ? getContentTypeByName(value._type)
      : undefined);
  const boundValue = contentType?.dynamicData
    ? await resolveRecordBindings({
        db: options.db,
        contentType,
        value,
      })
    : value;

  const entries = await Promise.all(
    Object.entries(boundValue).map(async ([key, item]) => [
      key,
      await resolveDynamicData(item, {
        ...options,
        contentType: undefined,
      }),
    ]),
  );

  return Object.fromEntries(entries) as T;
};

export const stripDynamicBindings = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripDynamicBindings(item)) as T;
  }

  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== DYNAMIC_BINDINGS_FIELD_NAME)
      .map(([key, item]) => [key, stripDynamicBindings(item)]),
  ) as T;
};

export const resolveContentOutput = async <T extends ContentType>({
  db,
  contentType,
  data,
  surface,
}: {
  db: DBService;
  contentType: T;
  data: DataPopulatedWithoutApiOnly<T>;
  surface: "web" | "preview";
}) => {
  const dynamicData = await resolveDynamicData(data, {
    db,
    contentType,
    surface,
  });
  const hooked = await runOnGetHook({
    db,
    contentType,
    data: dynamicData,
    surface,
  });

  return stripDynamicBindings(hooked);
};
