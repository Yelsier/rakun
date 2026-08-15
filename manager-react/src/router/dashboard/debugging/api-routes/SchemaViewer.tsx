'use client'

import { ChevronRight } from 'lucide-react'

import { CodeBlock } from './CodeBlock'

import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useTranslations } from '@/i18n'

type JsonSchema = Record<string, unknown>

const isRecord = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown): JsonSchema | null =>
  isRecord(value) ? value : null

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []

const getSchemaType = (schema: JsonSchema) => {
  const type = schema.type

  if (typeof type === 'string') return type
  if (Array.isArray(type)) return type.join(' | ')
  if (schema.enum) return 'enum'
  if (schema.oneOf) return 'oneOf'
  if (schema.anyOf) return 'anyOf'
  if (schema.allOf) return 'allOf'

  return 'any'
}

const formatValue = (value: unknown) => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value === null) return 'null'
  return JSON.stringify(value)
}

const getPropertyEntries = (schema: JsonSchema) => {
  const properties = asRecord(schema.properties)
  if (!properties) return []

  return Object.entries(properties).flatMap(([name, property]) => {
    const propertySchema = asRecord(property)
    return propertySchema ? ([[name, propertySchema]] as const) : []
  })
}

const SchemaBadges = ({
  schema,
  required,
}: {
  schema: JsonSchema
  required?: boolean
}) => {
  const t = useTranslations()
  return (
  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
    <Badge variant="secondary">{getSchemaType(schema)}</Badge>
    {required ? <Badge variant="outline">{t('common.required')}</Badge> : null}
    {typeof schema.format === 'string' ? (
      <Badge variant="outline">{schema.format}</Badge>
    ) : null}
  </div>
  )
}

const SchemaMeta = ({ schema }: { schema: JsonSchema }) => {
  const t = useTranslations()
  const enumValues = Array.isArray(schema.enum) ? schema.enum : []

  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {typeof schema.description === 'string' ? (
        <span>{schema.description}</span>
      ) : null}
      {'default' in schema ? (
        <span>
          {t('apiRoutes.schemaDefault')} {formatValue(schema.default)}
        </span>
      ) : null}
      {enumValues.length > 0 ? (
        <span>
          {t('apiRoutes.schemaValues')} {enumValues.map(formatValue).join(', ')}
        </span>
      ) : null}
      {typeof schema.minimum === 'number' ? (
        <span>
          {t('apiRoutes.schemaMin')} {schema.minimum}
        </span>
      ) : null}
      {typeof schema.maximum === 'number' ? (
        <span>
          {t('apiRoutes.schemaMax')} {schema.maximum}
        </span>
      ) : null}
      {typeof schema.minLength === 'number' ? (
        <span>
          {t('apiRoutes.schemaMinLength')} {schema.minLength}
        </span>
      ) : null}
      {typeof schema.maxLength === 'number' ? (
        <span>
          {t('apiRoutes.schemaMaxLength')} {schema.maxLength}
        </span>
      ) : null}
    </div>
  )
}

const Row = ({
  name,
  schema,
  required,
  expandable = false,
}: {
  name: string
  schema: JsonSchema
  required?: boolean
  expandable?: boolean
}) => {
  const content = (
    <>
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
        {expandable ? (
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="wrap-break-word font-mono text-sm font-medium">
          {name}
        </div>
        <SchemaMeta schema={schema} />
      </div>
      <SchemaBadges schema={schema} required={required} />
    </>
  )

  const className =
    'group flex w-full min-w-0 items-start justify-between gap-3 rounded-sm px-1.5 py-1.5 text-left hover:bg-muted/40'

  return expandable ? (
    <CollapsibleTrigger asChild>
      <button type="button" className={className}>
        {content}
      </button>
    </CollapsibleTrigger>
  ) : (
    <div className={className}>{content}</div>
  )
}

const getSchemaChildren = (schema: JsonSchema) => {
  const requiredFields = new Set(asStringArray(schema.required))
  const propertyEntries = getPropertyEntries(schema).map(
    ([name, propertySchema]) => ({
      name,
      schema: propertySchema,
      required: requiredFields.has(name),
    }),
  )
  const itemSchema = asRecord(schema.items)
  const variantEntries = (['oneOf', 'anyOf', 'allOf'] as const).flatMap(
    (key) => {
      const value = schema[key]
      if (!Array.isArray(value)) return []

      return value.filter(isRecord).map((variantSchema, index) => ({
        name: `${key} ${index + 1}`,
        schema: variantSchema,
        required: false,
      }))
    },
  )

  return [
    ...propertyEntries,
    ...(itemSchema ? [{ name: 'items', schema: itemSchema, required: false }] : []),
    ...variantEntries,
  ]
}

const SchemaChildren = ({ schema, depth }: { schema: JsonSchema; depth: number }) => {
  const children = getSchemaChildren(schema)

  if (children.length === 0) return null

  return (
    <ul className="ml-3 space-y-0.5">
      {children.map((child, index) => (
        <SchemaTreeNode
          key={`${child.name}-${index}`}
          name={child.name}
          schema={child.schema}
          required={child.required}
          isLast={index === children.length - 1}
          depth={depth}
        />
      ))}
    </ul>
  )
}

const SchemaTreeNode = ({
  name,
  schema,
  required,
  isLast,
  depth,
}: {
  name: string
  schema: JsonSchema
  required?: boolean
  isLast: boolean
  depth: number
}) => {
  const expandable = getSchemaChildren(schema).length > 0
  const node = (
    <>
      <Row name={name} schema={schema} required={required} expandable={expandable} />
      {expandable ? (
        <CollapsibleContent>
          <SchemaChildren schema={schema} depth={depth + 1} />
        </CollapsibleContent>
      ) : null}
    </>
  )

  return (
    <li className="relative pl-6">
      {!isLast ? (
        <span className="absolute left-0 top-4 h-full border-l border-border" />
      ) : null}
      <span className="absolute left-0 top-4 w-4 border-t border-border" />
      {expandable ? <Collapsible defaultOpen={depth < 1}>{node}</Collapsible> : node}
    </li>
  )
}

const RootSchemaNode = ({ schema }: { schema: JsonSchema }) => {
  const expandable = getSchemaChildren(schema).length > 0

  return (
    <div className="rounded-md border bg-background/60 p-3">
      {expandable ? (
        <Collapsible defaultOpen>
          <Row name={getSchemaType(schema)} schema={schema} expandable />
          <CollapsibleContent>
            <SchemaChildren schema={schema} depth={1} />
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <Row name={getSchemaType(schema)} schema={schema} />
      )}
    </div>
  )
}

export function SchemaViewer({
  schema,
}: {
  schema?: unknown
}) {
  const t = useTranslations()
  const schemaRecord = asRecord(schema)

  if (!schemaRecord) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('apiRoutes.noSchema')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <RootSchemaNode schema={schemaRecord} />
      <details className="mt-2 rounded-md border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          {t('apiRoutes.rawJsonSchema')}
        </summary>
        <CodeBlock className="mt-3 min-h-0">
          {JSON.stringify(schemaRecord, null, 2)}
        </CodeBlock>
      </details>
    </div>
  )
}
