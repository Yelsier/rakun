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
  contextSource?: {
    contentType: ContentType;
    value: Record<string, unknown>;
  };
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

const getAllowedSourceContentType = (sourceContentTypeName: string) => {
  const contentType = getContentTypeByName(sourceContentTypeName);

  return isDynamicDataSourceContentTypeAllowed(contentType)
    ? contentType
    : undefined;
};

const fileSourcePaths = new Set([
  "url",
  "previewUrl",
  "name",
  "title",
  "alt",
  "mime",
  "srcSet",
  "width",
  "height",
  "size",
]);

const isDynamicSourcePathAllowed = (
  contentType: ContentType,
  path: string | undefined,
  depth = 0,
): boolean => {
  if (!path) return false;

  const [fieldName, ...rest] = path.split(".");
  const field = contentType.fields[fieldName];
  if (!field || !contentType.allowsDynamicBindingForField(fieldName)) {
    return false;
  }

  if (rest.length === 0) return true;

  if (
    field.meta.type === "Relation" &&
    "contentType" in field &&
    depth < 3
  ) {
    return isDynamicSourcePathAllowed(
      field.contentType as ContentType,
      rest.join("."),
      depth + 1,
    );
  }

  if (field.meta.type === "File") {
    return rest.length === 1 && fileSourcePaths.has(rest[0]);
  }

  return false;
};

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
  source,
  currentSource,
  currentContentType,
  allowCurrentSource,
  contextSource,
}: {
  db: DBService;
  source: DynamicBindingSource;
  currentSource?: Record<string, unknown>;
  currentContentType?: ContentType;
  allowCurrentSource?: boolean;
  contextSource?: ResolveOptions["contextSource"];
}) => {
  const usesCurrentRecord =
    allowCurrentSource === true &&
    !source.id &&
    !!currentSource &&
    source.contentType === currentContentType?.name;
  const usesContextDocument =
    !source.id && source.contentType === contextSource?.contentType.name;
  const sourceContentType = usesCurrentRecord
    ? currentContentType
    : usesContextDocument
      ? contextSource?.contentType
    : getAllowedSourceContentType(source.contentType);
  if (!sourceContentType) {
    return undefined;
  }

  const sourceDocument =
    usesCurrentRecord
      ? currentSource
      : usesContextDocument
        ? contextSource?.value
        : await loadSourceDocument(db, source);
  if (!sourceDocument) return undefined;

  if (source.virtual === "href") {
    const sourceId =
      typeof sourceDocument._id === "string" ? sourceDocument._id : source.id;
    return sourceId ? await resolveHref(source, sourceId) : undefined;
  }

  if (!isDynamicSourcePathAllowed(sourceContentType, source.path)) {
    return undefined;
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
  binding,
  contextSource,
}: {
  db: DBService;
  binding: DynamicListBinding;
  contextSource?: ResolveOptions["contextSource"];
}) => {
  const sourceContentType = getAllowedSourceContentType(binding.contentType);
  if (!sourceContentType) {
    return undefined;
  }

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
              source,
              currentSource: populated,
              currentContentType: sourceContentType,
              allowCurrentSource: true,
              contextSource,
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

const getListTargetContentType = (
  field: ContentType["fields"][string] | undefined,
  itemName: string,
) => {
  if (!field || (field.meta.ui !== "List" && field.meta.ui !== "Iterator")) {
    return undefined;
  }

  if (!("fields" in field) || !Array.isArray(field.fields)) {
    return undefined;
  }

  const entry = field.fields.find((item) => item.name === itemName);
  if (
    !entry ||
    entry.field.meta.type !== "Relation" ||
    !("contentType" in entry.field)
  ) {
    return undefined;
  }

  return entry.field.contentType as ContentType;
};

const filterListBindingMap = (
  contentType: ContentType,
  fieldName: string,
  binding: DynamicListBinding,
): DynamicListBinding => {
  const targetContentType = getListTargetContentType(
    contentType.fields[fieldName],
    binding.itemName,
  );
  if (!targetContentType) return binding;

  return {
    ...binding,
    map: Object.fromEntries(
      Object.entries(binding.map).filter(([targetField]) =>
        targetContentType.allowsDynamicBindingForField(targetField),
      ),
    ),
  };
};

const getListItemStableKey = (item: unknown): string | undefined => {
  if (!isRecord(item)) return undefined;

  const name = typeof item.name === "string" ? item.name : "";
  const value = item.value;

  if (isRecord(value) && typeof value._id === "string") {
    return `${name}:${value._id}`;
  }

  if (
    isRecord(value) &&
    isRecord(value.data) &&
    typeof value.data._id === "string"
  ) {
    return `${name}:${value.data._id}`;
  }

  return undefined;
};

export const mergeDynamicListItems = (
  currentValue: unknown,
  resolvedValue: unknown,
) => {
  const currentItems = Array.isArray(currentValue) ? currentValue : [];
  const resolvedItems = Array.isArray(resolvedValue) ? resolvedValue : [];
  const seen = new Set<string>();
  const merged: unknown[] = [];

  for (const item of [...resolvedItems, ...currentItems]) {
    const key = getListItemStableKey(item);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }

    merged.push(item);
  }

  return merged;
};

const resolveRecordBindings = async ({
  db,
  contentType,
  value,
  contextSource,
}: {
  db: DBService;
  contentType: ContentType;
  value: Record<string, unknown>;
  contextSource?: ResolveOptions["contextSource"];
}) => {
  const bindings = getDynamicDocumentBindings(
    value[DYNAMIC_BINDINGS_FIELD_NAME],
  );
  if (!bindings) return value;

  const next = { ...value };

  for (const [field, source] of Object.entries(bindings.fields ?? {})) {
    if (!contentType.allowsDynamicBindingForField(field)) continue;

    try {
      const resolved = await resolveSourceValue({
        db,
        source,
        currentSource: value,
        currentContentType: contentType,
        contextSource,
      });
      if (resolved !== undefined) {
        next[field] = resolved;
      }
    } catch (error) {
      Logger.error("dynamicData: field binding failed", error as Error);
    }
  }

  for (const [field, binding] of Object.entries(bindings.lists ?? {})) {
    if (!contentType.allowsDynamicBindingForField(field)) continue;

    try {
      const filteredBinding = filterListBindingMap(contentType, field, binding);
      const resolved = await resolveListBinding({
        db,
        binding: filteredBinding,
        contextSource,
      });
      if (resolved !== undefined) {
        next[field] = mergeDynamicListItems(next[field], resolved);
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
  const boundValue = contentType
    ? await resolveRecordBindings({
        db: options.db,
        contentType,
        value,
        contextSource: options.contextSource,
      })
    : value;
  const contextSource =
    options.contextSource ??
    (contentType
      ? {
          contentType,
          value: boundValue,
        }
      : undefined);

  const entries = await Promise.all(
    Object.entries(boundValue).map(async ([key, item]) => [
      key,
      await resolveDynamicData(item, {
        ...options,
        contextSource,
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
