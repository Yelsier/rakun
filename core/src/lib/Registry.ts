import type ContentType from "./ContentType";
import { ContentReferenceField } from "./fields/ContentReference";
import type { Field } from "./fields/Field";
import { ListField } from "./fields/List";
import { RelationField } from "./fields/Relation";
import { SimpleListField } from "./fields/SimpleList";

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

const removeSchemaFromCT = <T extends ContentType>(ct: T): T => {
  return {
    ...ct,
    fields: Object.fromEntries(
      Object.entries(ct.fields).map(([key, field]) => [
        key,
        removeSchemaFromField(field),
      ]),
    ),
  };
};

const removeSchemaFromField = <T extends Field>(field: T): T => {
  if (field instanceof RelationField) {
    return {
      ...field,
      schema: undefined,
      contentType: removeSchemaFromCT(field.contentType),
    };
  }
  if (field instanceof ContentReferenceField) {
    const target = getContentTypeByName(field.contentType);
    return {
      ...field,
      schema: undefined,
      contentType: {
        name: target?.name || field.contentType,
        listFields: target?.listFields,
      },
    };
  }
  if (field instanceof ListField) {
    return {
      ...field,
      schema: undefined,
      fields: field.fields.map((f: { name: string; field: Field }) => ({
        name: f.name,
        field: removeSchemaFromField(f.field),
      })),
    };
  }
  if (field instanceof SimpleListField) {
    return {
      ...field,
      schema: undefined,
      field: removeSchemaFromField(field.field),
    };
  }
  return { ...field, schema: undefined };
};

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
