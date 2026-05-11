"use client";

import { CodeBlock } from "./CodeBlock";

import { Badge } from "@/components/ui/badge";

type JsonSchema = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonSchema =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): JsonSchema | null =>
  isRecord(value) ? value : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const getSchemaType = (schema: JsonSchema) => {
  const type = schema.type;

  if (typeof type === "string") return type;
  if (Array.isArray(type)) return type.join(" | ");
  if (schema.enum) return "enum";
  if (schema.oneOf) return "oneOf";
  if (schema.anyOf) return "anyOf";
  if (schema.allOf) return "allOf";

  return "any";
};

const formatValue = (value: unknown) => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) return "null";
  return JSON.stringify(value);
};

const getPropertyEntries = (schema: JsonSchema) => {
  const properties = asRecord(schema.properties);
  if (!properties) return [];

  return Object.entries(properties).flatMap(([name, property]) => {
    const propertySchema = asRecord(property);
    return propertySchema ? ([[name, propertySchema]] as const) : [];
  });
};

const SchemaBadges = ({
  schema,
  required,
}: {
  schema: JsonSchema;
  required?: boolean;
}) => (
  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
    <Badge variant="secondary">{getSchemaType(schema)}</Badge>
    {required ? <Badge variant="outline">required</Badge> : null}
    {typeof schema.format === "string" ? (
      <Badge variant="outline">{schema.format}</Badge>
    ) : null}
  </div>
);

const SchemaMeta = ({ schema }: { schema: JsonSchema }) => {
  const enumValues = Array.isArray(schema.enum) ? schema.enum : [];

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {typeof schema.description === "string" ? (
        <span>{schema.description}</span>
      ) : null}
      {"default" in schema ? (
        <span>default: {formatValue(schema.default)}</span>
      ) : null}
      {enumValues.length > 0 ? (
        <span>values: {enumValues.map(formatValue).join(", ")}</span>
      ) : null}
      {typeof schema.minimum === "number" ? (
        <span>min: {schema.minimum}</span>
      ) : null}
      {typeof schema.maximum === "number" ? (
        <span>max: {schema.maximum}</span>
      ) : null}
      {typeof schema.minLength === "number" ? (
        <span>min length: {schema.minLength}</span>
      ) : null}
      {typeof schema.maxLength === "number" ? (
        <span>max length: {schema.maxLength}</span>
      ) : null}
    </div>
  );
};

const Row = ({
  name,
  schema,
  required,
}: {
  name: string;
  schema: JsonSchema;
  required?: boolean;
}) => (
  <div className="flex min-w-0 items-start justify-between gap-3 rounded-sm px-1.5 py-1.5 hover:bg-muted/40">
    <div className="min-w-0">
      <div className="break-words font-mono text-sm font-medium">{name}</div>
      <SchemaMeta schema={schema} />
    </div>
    <SchemaBadges schema={schema} required={required} />
  </div>
);

const SchemaChildren = ({ schema }: { schema: JsonSchema }) => {
  const requiredFields = new Set(asStringArray(schema.required));
  const propertyEntries = getPropertyEntries(schema).map(
    ([name, propertySchema]) => ({
      name,
      schema: propertySchema,
      required: requiredFields.has(name),
    }),
  );
  const itemSchema = asRecord(schema.items);
  const variantEntries = (["oneOf", "anyOf", "allOf"] as const).flatMap(
    (key) => {
      const value = schema[key];
      if (!Array.isArray(value)) return [];

      return value.filter(isRecord).map((variantSchema, index) => ({
        name: `${key} ${index + 1}`,
        schema: variantSchema,
        required: false,
      }));
    },
  );
  const children = [
    ...propertyEntries,
    ...(itemSchema ? [{ name: "items", schema: itemSchema, required: false }] : []),
    ...variantEntries,
  ];

  if (children.length === 0) return null;

  return (
    <ul className="ml-3 space-y-0.5">
      {children.map((child, index) => (
        <SchemaTreeNode
          key={`${child.name}-${index}`}
          name={child.name}
          schema={child.schema}
          required={child.required}
          isLast={index === children.length - 1}
        />
      ))}
    </ul>
  );
};

const SchemaTreeNode = ({
  name,
  schema,
  required,
  isLast,
}: {
  name: string;
  schema: JsonSchema;
  required?: boolean;
  isLast: boolean;
}) => (
  <li className="relative pl-6">
    {!isLast ? (
      <span className="absolute left-0 top-4 h-full border-l border-border" />
    ) : null}
    <span className="absolute left-0 top-4 w-4 border-t border-border" />
    <Row name={name} schema={schema} required={required} />
    <SchemaChildren schema={schema} />
  </li>
);

const RootSchemaNode = ({ schema }: { schema: JsonSchema }) => (
  <div className="rounded-md border bg-background/60 p-3">
    <Row name={getSchemaType(schema)} schema={schema} />
    <SchemaChildren schema={schema} />
  </div>
);

export function SchemaViewer({ schema }: { schema?: unknown }) {
  const schemaRecord = asRecord(schema);

  if (!schemaRecord) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        No schema
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RootSchemaNode schema={schemaRecord} />
      <details className="mt-2 rounded-md border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Raw JSON Schema
        </summary>
        <CodeBlock className="mt-3 min-h-0">
          {JSON.stringify(schemaRecord, null, 2)}
        </CodeBlock>
      </details>
    </div>
  );
}
