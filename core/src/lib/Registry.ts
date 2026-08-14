import type ContentType from "./ContentType";
import type { AnyField } from "./fields/Field";
import { relationField } from "./fields/Relation";
import { TemplateContent } from "../internal-content-types/TemplateContent";
import { getRakunBootstrapOptions } from "../bootstrapState";
import { ITERATOR_FIELD_NAME } from "./systemFields";

type EncodedField = {
  schema: undefined;
  config: ReturnType<AnyField["getConfig"]>;
  isRequired: ReturnType<AnyField["getIsRequired"]>;
  isTranslatable: ReturnType<AnyField["getIsTranslatable"]>;
  visibility: ReturnType<AnyField["getVisibility"]>;
  isDynamic: ReturnType<AnyField["getIsDynamic"]>;
  condition: ReturnType<AnyField["getCondition"]>;
} & Record<string, unknown>;

const registry: Record<string, ContentType> = {};
const internalRegistry: Record<string, ContentType> = {};

export function registerContentType(
  ct: ContentType,
  options?: { override?: boolean },
) {
  if (registry[ct.name] && !options?.override) {
    return;
  }
  registry[ct.name] = ct;
}

export function clearExternalContentTypes() {
  for (const key of Object.keys(registry)) {
    delete registry[key];
  }
}

export function registerInternalContentType(
  ct: ContentType,
  options?: { override?: boolean },
) {
  if (internalRegistry[ct.name] && !options?.override) {
    return;
  }
  ct.isInternal = true;
  internalRegistry[ct.name] = ct;
}

export function getContentTypes() {
  return Object.values(registry).concat(Object.values(internalRegistry));
}

export const encodeContentTypeForManager = <T extends ContentType>(
  ct: T,
  templateEditor = false,
) => {
  const routes = (getRakunBootstrapOptions()?.routes ?? [])
    .filter((route) => route.contentType === ct.name)
    .map((route) => ({
      key: route.key,
      hasPage: route.hasPage,
    }));

  return {
    name: ct.name,
    menu: ct.menu,
    modulePicker: ct.modulePicker,
    uniques: ct.uniques,
    listFields: ct.listFields,
    isHiddenFromManager: ct.isHiddenFromManager,
    schemaVersion: ct.schemaVersion,
    versioning: ct.versioning,
    documentVisibility: ct.documentVisibility,
    permissions: ct.permissions,
    dynamicData: ct.dynamicData,
    dynamicDataSource: ct.dynamicDataSource,
    hasIterator: ct.hasIterator,
    hasTemplate: ct.hasTemplate,
    templateField: !templateEditor && ct.hasTemplate
      ? removeSchemaFromField(ct.fields[ITERATOR_FIELD_NAME], true)
      : undefined,
    hasSeo: ct.hasSeo,
    routes,
    isInternal: ct.isInternal,
    fields: Object.fromEntries(
      Object.entries(ct.fields).map(([key, field]) => [
        key,
        removeSchemaFromField(field, templateEditor),
      ]),
    ),
  };
};

const removeSchemaFromField = (
  field: AnyField,
  templateEditor = false,
): EncodedField => {
  const base = {
    ...(field.meta as Record<string, unknown>),
    schema: undefined,
    config: field.getConfig(),
    isRequired: field.getIsRequired(),
    isTranslatable: field.getIsTranslatable(),
    visibility: field.getVisibility(),
    isDynamic: field.getIsDynamic(),
    description: field.getDescription(),
    help: field.getHelp(),
    condition: field.getCondition(),
  } satisfies EncodedField;

  if (field.meta.ui === "ContentType" && "contentType" in field) {
    return {
      ...base,
      contentType: encodeContentTypeForManager(
        field.contentType as ContentType,
        templateEditor,
      ),
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
      fields: [
        ...field.fields.map((entry: { name: string; field: AnyField }) => ({
          name: entry.name,
          field: removeSchemaFromField(entry.field, templateEditor),
        })),
        ...(templateEditor
          ? [
              {
                name: TemplateContent.name,
                field: removeSchemaFromField(
                  relationField(TemplateContent, "new"),
                  true,
                ),
              },
            ]
          : []),
      ],
    };
  }

  if (
    field.meta.ui === "SimpleList" &&
    "field" in field &&
    isField(field.field)
  ) {
    return {
      ...base,
      field: removeSchemaFromField(field.field, templateEditor),
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
    .map((ct) => encodeContentTypeForManager(ct))
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
