import type ContentType from "./ContentType";
import type { AnyField } from "./fields/Field";

type EncodedField = {
  schema: undefined;
  config: ReturnType<AnyField["getConfig"]>;
  isRequired: ReturnType<AnyField["getIsRequired"]>;
  isTranslatable: ReturnType<AnyField["getIsTranslatable"]>;
  visibility: ReturnType<AnyField["getVisibility"]>;
} & Record<string, unknown>;

const registry: Record<string, ContentType> = {};
const internalRegistry: Record<string, ContentType> = {};

export function registerContentType(ct: ContentType) {
  if (registry[ct.name]) {
    return;
  }
  registry[ct.name] = ct;
}

export function registerInternalContentType(
  ct: ContentType,
  options?: { override?: boolean },
) {
  if (internalRegistry[ct.name] && !options?.override) {
    return;
  }
  internalRegistry[ct.name] = ct;
}

export function getContentTypes() {
  return Object.values(registry).concat(Object.values(internalRegistry));
}

const removeSchemaFromCT = <T extends ContentType>(ct: T) => {
  return {
    name: ct.name,
    menu: ct.menu,
    uniques: ct.uniques,
    listFields: ct.listFields,
    isHiddenFromManager: ct.isHiddenFromManager,
    schemaVersion: ct.schemaVersion,
    versioning: ct.versioning,
    documentVisibility: ct.documentVisibility,
    fields: Object.fromEntries(
      Object.entries(ct.fields).map(([key, field]) => [
        key,
        removeSchemaFromField(field),
      ]),
    ),
  };
};

const removeSchemaFromField = (field: AnyField): EncodedField => {
  const base = {
    ...(field.meta as Record<string, unknown>),
    schema: undefined,
    config: field.getConfig(),
    isRequired: field.getIsRequired(),
    isTranslatable: field.getIsTranslatable(),
    visibility: field.getVisibility(),
  } satisfies EncodedField;

  if (field.meta.ui === "ContentType" && "contentType" in field) {
    return {
      ...base,
      contentType: removeSchemaFromCT(field.contentType as ContentType),
    };
  }

  if (
    (field.meta.ui === "ContentTypeSelect" ||
      field.meta.ui === "ContentTypeMultiSelect") &&
    "contentType" in field.meta &&
    typeof field.meta.contentType === "string"
  ) {
    const target = getContentTypeByName(field.meta.contentType);
    return {
      ...base,
      contentType: {
        name: target?.name || field.meta.contentType,
        listFields: target?.listFields,
      },
    };
  }

  if (
    (field.meta.ui === "List" || field.meta.ui === "Iterator") &&
    "fields" in field &&
    Array.isArray(field.fields)
  ) {
    return {
      ...base,
      fields: field.fields.map((entry: { name: string; field: AnyField }) => ({
        name: entry.name,
        field: removeSchemaFromField(entry.field),
      })),
    };
  }

  if (
    field.meta.ui === "SimpleList" &&
    "field" in field &&
    isField(field.field)
  ) {
    return {
      ...base,
      field: removeSchemaFromField(field.field),
    };
  }

  return base;
};

function isField(value: unknown): value is AnyField {
  return (
    !!value &&
    typeof value === "object" &&
    "kind" in value &&
    value.kind === "field"
  );
}

export function getContentTypesForManager() {
  return getContentTypes()
    .map((ct) => removeSchemaFromCT(ct))
    .filter((ct) => !ct.isHiddenFromManager);
}

export function getInternalContentTypes() {
  return Object.values(internalRegistry);
}

export function getExternalContentTypes() {
  return Object.values(registry);
}

export function getContentTypeByName(name: string) {
  return registry[name] || internalRegistry[name];
}
