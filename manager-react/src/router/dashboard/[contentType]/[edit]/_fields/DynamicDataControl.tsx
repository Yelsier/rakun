'use client'

import type {
  DynamicBindingSource,
  DynamicDocumentBindings,
  DynamicListBinding,
  DynamicListDocumentSource,
  DynamicListMapSource,
  DynamicRelatedCollectionSource,
  EncodedContentType,
  EncodedFileField,
  EncodedFieldUnknown,
  EncodedListField,
  EncodedRelationField,
  EncodedSimpleListField,
} from '@rakun-kit/core/client'
import {
  DYNAMIC_QUERY_CURRENT_VALUE_KEY,
  ITERATOR_FIELD_NAME,
  getListField,
  isDynamicDataSourceContentTypeAllowed,
  isTranslatableObject,
} from '@rakun-kit/core/client'
import {
  Cable,
  ChevronRight,
  HelpCircle,
  Link2,
  ListFilter,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useManagerQuery } from '@/client/react'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type FieldBinding = DynamicBindingSource | undefined
type ListMapSource = DynamicListMapSource | undefined

export const isDynamicFallbackRequired = (
  field: Pick<EncodedFieldUnknown, 'isRequired'>,
  binding: unknown,
) => field.isRequired && !binding

type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'in'
  | 'notIn'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'true'
  | 'false'
  | 'exists'
  | 'notExists'
type FilterCondition = {
  field: string
  operator: FilterOperator
  value: string
  valueSource?: 'literal' | 'current'
}
type FilterState = {
  combinator: 'and' | 'or'
  conditions: FilterCondition[]
}
type SourceFieldKind =
  | 'string'
  | 'richText'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'
  | 'unknown'
type SourceFieldOption = {
  label: string
  value: string
  kind: SourceFieldKind
}
type CurrentDocumentListSourceOption = {
  label: string
  value: string
  contentType: EncodedContentType
  path: string
  itemName?: string
}

const CURRENT_DOCUMENT_ID = '__rakun_current_document__'

const cloneDynamicBindings = (
  bindings: DynamicDocumentBindings | undefined,
) => (bindings ? structuredClone(bindings) : undefined)

const cleanDynamicBindings = (
  bindings: DynamicDocumentBindings | undefined,
): DynamicDocumentBindings | undefined => {
  if (!bindings) return undefined

  const fields =
    bindings.fields && Object.keys(bindings.fields).length > 0
      ? bindings.fields
      : undefined
  const lists =
    bindings.lists && Object.keys(bindings.lists).length > 0
      ? bindings.lists
      : undefined

  return fields || lists ? { fields, lists } : undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isListField = (field: EncodedFieldUnknown) =>
  field.config.ui === 'List' || field.config.ui === 'Iterator'

const isRelatedCollectionSource = (
  source: ListMapSource,
): source is DynamicRelatedCollectionSource =>
  !!source && 'kind' in source && source.kind === 'relatedCollection'

const isDynamicVisibleField = (field: EncodedFieldUnknown) =>
  (field.visibility ?? 'all') === 'all' && field.isDynamic !== false

const isSelectableDynamicField = (
  name: string,
  field: EncodedFieldUnknown,
) => name !== ITERATOR_FIELD_NAME && isDynamicVisibleField(field)

export const isDynamicFieldEnabled = (
  contentType: EncodedContentType,
  field: EncodedFieldUnknown,
) => {
  return (
    contentType.dynamicData !== false &&
    isDynamicVisibleField(field)
  )
}

const getFieldKind = (field: EncodedFieldUnknown): SourceFieldKind => {
  if (field.config.type === 'String') {
    return field.config.ui === 'RichText' ? 'richText' : 'string'
  }
  if (field.config.type === 'Link') return 'string'
  if (field.config.type === 'Number') return 'number'
  if (field.config.type === 'Boolean') return 'boolean'
  if (field.config.type === 'Date') {
    return field.config.ui === 'Time' ? 'string' : 'date'
  }
  if (field.config.type === 'Select') {
    return (field as { isMultiple?: boolean }).isMultiple ? 'array' : 'string'
  }
  if (field.config.type === 'ContentReference') {
    return (field as { isMultiple?: boolean }).isMultiple ? 'array' : 'string'
  }
  if (field.config.type === 'File') {
    return (field as { isMultiple?: boolean }).isMultiple ? 'array' : 'object'
  }
  if (field.config.type === 'Relation') return 'object'
  if (field.config.ui === 'SimpleList') return 'array'
  if (isListField(field)) return 'array'

  return 'unknown'
}

const isCompatibleSourceKind = (
  sourceKind: SourceFieldKind,
  targetField?: EncodedFieldUnknown,
) => {
  if (!targetField) return sourceKind !== 'object' && sourceKind !== 'array'

  return sourceKind === getFieldKind(targetField)
}

const getFileField = (field: EncodedFieldUnknown) =>
  field.config.type === 'File' ? (field as EncodedFileField) : undefined

const areFieldKindsCompatible = (
  sourceField: EncodedFieldUnknown,
  targetField?: EncodedFieldUnknown,
) => {
  const sourceKind = getFieldKind(sourceField)
  if (!targetField) return isCompatibleSourceKind(sourceKind)

  const targetKind = getFieldKind(targetField)
  if (sourceKind !== targetKind) return false

  const sourceFile = getFileField(sourceField)
  const targetFile = getFileField(targetField)
  if (!sourceFile && !targetFile) return true
  if (!sourceFile || !targetFile) return false

  return (
    sourceFile.isMultiple === targetFile.isMultiple &&
    (sourceFile.mediaType === 'Any' ||
      targetFile.mediaType === 'Any' ||
      sourceFile.mediaType === targetFile.mediaType)
  )
}

const fieldLabel = (path: string) =>
  path.startsWith('_seo.') ? `seo.${path.slice('_seo.'.length)}` : path

const isSeoPath = (path: string) =>
  path.split('.').some((segment) => segment === '_seo' || segment === 'seo')

const fileFieldOptions = (
  path: string,
  targetField?: EncodedFieldUnknown,
): SourceFieldOption[] => {
  const options: SourceFieldOption[] = [
    { label: fieldLabel(`${path}.url`), value: `${path}.url`, kind: 'string' },
    {
      label: fieldLabel(`${path}.previewUrl`),
      value: `${path}.previewUrl`,
      kind: 'string',
    },
    { label: fieldLabel(`${path}.name`), value: `${path}.name`, kind: 'string' },
    {
      label: fieldLabel(`${path}.title`),
      value: `${path}.title`,
      kind: 'string',
    },
    { label: fieldLabel(`${path}.alt`), value: `${path}.alt`, kind: 'string' },
    { label: fieldLabel(`${path}.mime`), value: `${path}.mime`, kind: 'string' },
    {
      label: fieldLabel(`${path}.srcSet`),
      value: `${path}.srcSet`,
      kind: 'string',
    },
    { label: fieldLabel(`${path}.width`), value: `${path}.width`, kind: 'number' },
    {
      label: fieldLabel(`${path}.height`),
      value: `${path}.height`,
      kind: 'number',
    },
    { label: fieldLabel(`${path}.size`), value: `${path}.size`, kind: 'number' },
  ]

  return options.filter((option) =>
    isCompatibleSourceKind(option.kind, targetField),
  )
}

const nestedSourceFieldOptions = ({
  contentType,
  prefix = '',
  targetField,
  depth = 0,
}: {
  contentType: EncodedContentType
  prefix?: string
  targetField?: EncodedFieldUnknown
  depth?: number
}): SourceFieldOption[] =>
  Object.entries(contentType.fields).flatMap(([name, field]) => {
    if (!isSelectableDynamicField(name, field)) return []

    const path = prefix ? `${prefix}.${name}` : name
    const kind = getFieldKind(field)

    if (isSeoPath(path)) return []

    if (field.config.type === 'Relation' && depth < 3) {
      const relationContentType = (field as EncodedRelationField).contentType
      const idOption: SourceFieldOption[] = isCompatibleSourceKind(
        'string',
        targetField,
      )
        ? [
            {
              label: fieldLabel(`${path}._id`),
              value: `${path}._id`,
              kind: 'string',
            },
          ]
        : []

      return [
        ...idOption,
        ...nestedSourceFieldOptions({
          contentType: relationContentType,
          prefix: path,
          targetField,
          depth: depth + 1,
        }),
      ]
    }

    if (field.config.type === 'File') {
      const fieldOption = areFieldKindsCompatible(field, targetField)
        ? [
            {
              label: fieldLabel(path),
              value: path,
              kind,
            },
          ]
        : []

      if ((field as EncodedFileField).isMultiple) return fieldOption

      return [...fieldOption, ...fileFieldOptions(path, targetField)]
    }

    if (!areFieldKindsCompatible(field, targetField)) return []

    return [
      {
        label: fieldLabel(path),
        value: path,
        kind,
      },
    ]
  })

export const sourceFieldOptions = (
  contentType?: EncodedContentType,
  targetField?: EncodedFieldUnknown,
): SourceFieldOption[] => {
  if (!contentType) return []

  const fields = nestedSourceFieldOptions({ contentType, targetField })
  const includeHref =
    contentType.routes?.some((route) => route.hasPage) &&
    isCompatibleSourceKind('string', targetField)

  return includeHref
    ? [{ label: 'href', value: '$href', kind: 'string' }, ...fields]
    : fields
}

const currentDocumentListSourceValue = (path: string, itemName?: string) =>
  `current-document:${path}:${itemName ?? ''}`

export const currentDocumentListSourceOptions = (
  contentType: EncodedContentType,
): CurrentDocumentListSourceOption[] =>
  Object.entries(contentType.fields).flatMap(([name, field]) => {
    if (!isSelectableDynamicField(name, field) || field.isTranslatable) return []

    if (field.config.ui === 'List' || field.config.ui === 'Iterator') {
      const relationEntries = (field as EncodedListField).fields.filter(
        (entry) =>
          entry.name !== ITERATOR_FIELD_NAME &&
          entry.field.config.type === 'Relation',
      )

      return relationEntries.map((entry) => ({
        label:
          relationEntries.length === 1
            ? `Current document · ${name}`
            : `Current document · ${name} (${entry.name})`,
        value: currentDocumentListSourceValue(name, entry.name),
        contentType: (entry.field as EncodedRelationField).contentType,
        path: name,
        itemName: entry.name,
      }))
    }

    if (field.config.ui === 'SimpleList') {
      const itemField = (field as EncodedSimpleListField).field
      if (itemField.config.type !== 'Relation') return []

      return [
        {
          label: `Current document · ${name}`,
          value: currentDocumentListSourceValue(name),
          contentType: (itemField as EncodedRelationField).contentType,
          path: name,
        },
      ]
    }

    return []
  })

const createSource = (
  contentType: string,
  value: string,
  id?: string,
): DynamicBindingSource =>
  value === '$href'
    ? { contentType, id, virtual: 'href' }
    : { contentType, id, path: value }

const sourceValue = (source?: DynamicBindingSource) =>
  source?.virtual === 'href' ? '$href' : source?.path || ''

const sourceLabel = (source?: DynamicBindingSource) =>
  source?.virtual === 'href' ? 'href' : fieldLabel(source?.path || '')

const mappingSourceSummary = (
  source: ListMapSource,
  currentSourceName: string,
) => {
  if (!source) {
    return {
      mode: 'Not configured',
      detail: 'Choose a mapping source',
    }
  }

  if (!isRelatedCollectionSource(source)) {
    return {
      mode: 'Direct field',
      detail: `${currentSourceName}.${sourceLabel(source)}`,
    }
  }

  const sort = Object.entries(source.sort ?? {})[0]
  const sortSummary = sort ? ` · sort ${sort[0]} ${sort[1]}` : ''

  return {
    mode: 'Related collection',
    detail: `${source.contentType}.${source.relation} → ${currentSourceName} · collect ${source.path} · limit ${source.limit}${sortSummary}`,
  }
}

const sourceContentTypeLabel = (
  source: DynamicBindingSource,
  documentContentTypeName: string,
) =>
  source.contentType === documentContentTypeName && !source.id
    ? 'Current document'
    : source.contentType

const getSourceContentTypes = (
  contentTypes: EncodedContentType[],
) =>
  contentTypes.filter((sourceContentType) =>
    isDynamicDataSourceContentTypeAllowed(sourceContentType),
  )

const operatorByMongoOperator: Record<string, FilterOperator> = {
  $eq: 'equals',
  $ne: 'notEquals',
  $contains: 'contains',
  $in: 'in',
  $nin: 'notIn',
  $gt: 'greaterThan',
  $gte: 'greaterThanOrEqual',
  $lt: 'lessThan',
  $lte: 'lessThanOrEqual',
}

const readFilterOperand = (
  value: unknown,
): Pick<FilterCondition, 'value' | 'valueSource'> => {
  if (
    isRecord(value) &&
    typeof value[DYNAMIC_QUERY_CURRENT_VALUE_KEY] === 'string'
  ) {
    return {
      value: value[DYNAMIC_QUERY_CURRENT_VALUE_KEY],
      valueSource: 'current' as const,
    }
  }

  return {
    value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
  }
}

const filterConditionFromEntry = (
  field: string,
  value: unknown,
): FilterCondition => {
  if (value === true) return { field, operator: 'true', value: '' }
  if (value === false) return { field, operator: 'false', value: '' }

  const directOperand = readFilterOperand(value)
  if (directOperand.valueSource === 'current') {
    return { field, operator: 'equals', ...directOperand }
  }

  if (isRecord(value)) {
    if (typeof value.$exists === 'boolean') {
      return {
        field,
        operator: value.$exists ? 'exists' : 'notExists',
        value: '',
      }
    }

    const operatorEntry = Object.entries(value).find(
      ([operator]) => operator in operatorByMongoOperator,
    )
    if (operatorEntry) {
      const [operator, operatorValue] = operatorEntry
      return {
        field,
        operator: operatorByMongoOperator[operator],
        ...readFilterOperand(operatorValue),
      }
    }
  }

  return {
    field,
    operator: 'equals',
    value: typeof value === 'string' ? value : String(value ?? ''),
  }
}

export const readFilterState = (
  filter: Record<string, unknown> | undefined,
): FilterState => {
  if (!filter) return { combinator: 'and', conditions: [] }

  const logicalEntry = ['$and', '$or'].find((key) => Array.isArray(filter[key]))
  if (logicalEntry) {
    const conditions = (filter[logicalEntry] as unknown[]).flatMap((item) =>
      isRecord(item)
        ? Object.entries(item)
            .filter(([field]) => !field.startsWith('$'))
            .map(([field, value]) => filterConditionFromEntry(field, value))
        : [],
    )

    return {
      combinator: logicalEntry === '$or' ? 'or' : 'and',
      conditions,
    }
  }

  return {
    combinator: 'and',
    conditions: Object.entries(filter)
      .filter(([field]) => !field.startsWith('$'))
      .map(([field, value]) => filterConditionFromEntry(field, value)),
  }
}

const operatorNeedsValue = (operator: FilterOperator) =>
  !['true', 'false', 'exists', 'notExists'].includes(operator)

const parseFilterValue = (
  condition: FilterCondition,
  fieldOptions: SourceFieldOption[],
) => {
  const kind = fieldOptions.find(
    (option) => option.value === condition.field,
  )?.kind
  const parseValue = (value: string) =>
    kind === 'number' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : value.trim()

  if (condition.operator === 'in' || condition.operator === 'notIn') {
    return condition.value
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map(parseValue)
  }

  return parseValue(condition.value)
}

const buildFilterCondition = (
  condition: FilterCondition,
  fieldOptions: SourceFieldOption[],
) => {
  if (!condition.field) return undefined
  if (condition.operator === 'true') return { [condition.field]: true }
  if (condition.operator === 'false') return { [condition.field]: false }
  if (condition.operator === 'exists') {
    return { [condition.field]: { $exists: true } }
  }
  if (condition.operator === 'notExists') {
    return { [condition.field]: { $exists: false } }
  }
  if (!condition.value.trim()) return undefined

  const value =
    condition.valueSource === 'current'
      ? { [DYNAMIC_QUERY_CURRENT_VALUE_KEY]: condition.value }
      : parseFilterValue(condition, fieldOptions)
  const mongoOperator: Partial<Record<FilterOperator, string>> = {
    notEquals: '$ne',
    contains: '$contains',
    in: '$in',
    notIn: '$nin',
    greaterThan: '$gt',
    greaterThanOrEqual: '$gte',
    lessThan: '$lt',
    lessThanOrEqual: '$lte',
  }
  const operator = mongoOperator[condition.operator]

  return operator
    ? { [condition.field]: { [operator]: value } }
    : { [condition.field]: value }
}

export const buildFilter = (
  state: FilterState,
  fieldOptions: SourceFieldOption[] = [],
) => {
  const conditions: Record<string, unknown>[] = state.conditions.flatMap(
    (condition) => {
      const builtCondition = buildFilterCondition(condition, fieldOptions)
      return builtCondition ? [builtCondition] : []
    },
  )

  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]

  return { [state.combinator === 'or' ? '$or' : '$and']: conditions }
}

const filterSummary = (filter: Record<string, unknown> | undefined) => {
  const state = readFilterState(filter)
  if (state.conditions.length === 0) return ''

  const first = state.conditions[0]
  const operatorLabels: Record<FilterOperator, string> = {
    equals: '=',
    notEquals: '!=',
    contains: 'contains',
    in: 'in',
    notIn: 'not in',
    greaterThan: '>',
    greaterThanOrEqual: '>=',
    lessThan: '<',
    lessThanOrEqual: '<=',
    true: '= true',
    false: '= false',
    exists: 'is set',
    notExists: 'is not set',
  }
  const firstSummary = [
    first.field,
    operatorLabels[first.operator],
    operatorNeedsValue(first.operator)
      ? first.valueSource === 'current'
        ? `Current document.${first.value}`
        : first.value
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  const remaining = state.conditions.length - 1

  return remaining > 0
    ? `${firstSummary} + ${remaining} ${remaining === 1 ? 'condition' : 'conditions'}`
    : firstSummary
}

const bindingSummary = ({
  list,
  fieldBinding,
  listBinding,
  documentContentTypeName,
}: {
  list: boolean
  fieldBinding?: DynamicBindingSource
  listBinding?: DynamicListBinding
  documentContentTypeName: string
}) => {
  if (list) {
    if (!listBinding) return ''

    const source = listBinding.source
      ? `Current document.${listBinding.source.path}`
      : listBinding.contentType
    const limit = listBinding.query?.options?.limit ?? 10
    const filter = filterSummary(listBinding.query?.filter)

    return [
      `${source} -> ${listBinding.itemName}`,
      listBinding.source ? '' : `limit ${limit}`,
      listBinding.source ? '' : filter,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (!fieldBinding) return ''

  return `${sourceContentTypeLabel(
    fieldBinding,
    documentContentTypeName,
  )} -> ${sourceLabel(fieldBinding)}`
}

const PanelSection = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <div className='grid gap-3 rounded-md border border-border bg-muted/20 p-3'>
    <div className='text-xs font-semibold uppercase text-muted-foreground'>
      {title}
    </div>
    {children}
  </div>
)

const ControlLabel = ({
  children,
  help,
}: {
  children: ReactNode
  help: string
}) => (
  <div className='flex items-center gap-1.5'>
    <Label>{children}</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className='rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={help}
        >
          <HelpCircle className='h-3.5 w-3.5' />
        </button>
      </TooltipTrigger>
      <TooltipContent side='top' sideOffset={6} className='max-w-xs'>
        {help}
      </TooltipContent>
    </Tooltip>
  </div>
)

const FieldBindingEditor = ({
  contentTypes,
  documentContentType,
  currentDocumentSourceEnabled,
  targetField,
  binding,
  onChange,
}: {
  contentTypes: EncodedContentType[]
  documentContentType: EncodedContentType
  currentDocumentSourceEnabled: boolean
  targetField: EncodedFieldUnknown
  binding: FieldBinding
  onChange: (binding: FieldBinding) => void
}) => {
  const { language } = useLanguage()
  const [sourceType, setSourceType] = useState(binding?.contentType || '')
  const [sourceId, setSourceId] = useState(
    binding &&
      currentDocumentSourceEnabled &&
      binding.contentType === documentContentType.name &&
      !binding.id
      ? CURRENT_DOCUMENT_ID
      : binding?.id || '',
  )
  const [fieldPath, setFieldPath] = useState(sourceValue(binding))
  const usesCurrentDocumentSource =
    currentDocumentSourceEnabled && sourceType === documentContentType.name
  const selectedContentType = usesCurrentDocumentSource
    ? documentContentType
    : contentTypes.find((ct) => ct.name === sourceType)
  const sourceItemsQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: sourceType || 'Route',
      query: {
        options: {
          limit: 'all',
        },
      },
    },
    enabled:
      !!sourceType &&
      !usesCurrentDocumentSource &&
      selectedContentType?.dynamicDataSource === true,
  })
  const items = ((sourceItemsQuery.data as
    | { items?: Array<Record<string, unknown> & { _id: string }> }
    | undefined)?.items ?? []) as Array<Record<string, unknown> & { _id: string }>
  const hasCurrentDocumentItem =
    currentDocumentSourceEnabled && sourceType === documentContentType.name
  const hasItemOptions = hasCurrentDocumentItem || items.length > 0
  const fieldOptions = sourceFieldOptions(selectedContentType, targetField)

  const emit = (nextType = sourceType, nextId = sourceId, nextPath = fieldPath) => {
    const usesCurrentDocument =
      currentDocumentSourceEnabled &&
      nextType === documentContentType.name &&
      nextId === CURRENT_DOCUMENT_ID

    if (!nextType || !nextPath || (!usesCurrentDocument && !nextId)) {
      onChange(undefined)
      return
    }

    onChange(createSource(nextType, nextPath, usesCurrentDocument ? undefined : nextId))
  }

  return (
    <PanelSection title='Source value'>
      <div className='grid gap-3 md:grid-cols-[1fr_1.4fr_1fr]'>
        <Label className='grid gap-1.5'>
          Source
          <Select
            disabled={contentTypes.length === 0}
            value={sourceType}
            onValueChange={(value) => {
              const nextId =
                currentDocumentSourceEnabled &&
                value === documentContentType.name
                  ? CURRENT_DOCUMENT_ID
                  : ''

              setSourceType(value)
              setSourceId(nextId)
              setFieldPath('')
              onChange(undefined)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  contentTypes.length > 0 ? 'Content type' : 'No content types'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {contentTypes.map((ct) => (
                  <SelectItem key={ct.name} value={ct.name}>
                    {currentDocumentSourceEnabled &&
                    ct.name === documentContentType.name
                      ? `${ct.name} (current document)`
                      : ct.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Label>
        <Label className='grid gap-1.5'>
          Item
          <Select
            disabled={!sourceType || !hasItemOptions}
            value={sourceId}
            onValueChange={(value) => {
              setSourceId(value)
              emit(sourceType, value, fieldPath)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={hasItemOptions ? 'Item' : 'No items available'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {hasCurrentDocumentItem ? (
                  <SelectItem value={CURRENT_DOCUMENT_ID}>
                    Current document
                  </SelectItem>
                ) : null}
                {items.map((item) => {
                  const label = selectedContentType
                    ? getListField(item, selectedContentType.listFields ?? [])
                    : item._id

                  return (
                    <SelectItem key={item._id} value={item._id}>
                      {isTranslatableObject(label)
                        ? label[language.code]
                        : String(label || item._id)}
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Label>
        <Label className='grid gap-1.5'>
          Field
          <Select
            disabled={!sourceType || !sourceId || fieldOptions.length === 0}
            value={fieldPath}
            onValueChange={(value) => {
              setFieldPath(value)
              emit(sourceType, sourceId, value)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  fieldOptions.length > 0 ? 'Field' : 'No compatible fields'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {fieldOptions.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Label>
      </div>
    </PanelSection>
  )
}

const getListTargetContentType = (
  field: EncodedListField,
  itemName: string,
) => {
  const entry = field.fields.find((item) => item.name === itemName)
  if (!entry || entry.field.config.type !== 'Relation') return undefined

  return (entry.field as EncodedRelationField).contentType
}

const getRelationContentType = (field: EncodedFieldUnknown) => {
  if (field.isTranslatable) return undefined

  if (field.config.type === 'Relation') {
    return (field as EncodedRelationField).contentType
  }

  if (field.config.ui === 'SimpleList') {
    const itemField = (field as EncodedSimpleListField).field
    if (itemField.config.type === 'Relation') {
      return (itemField as EncodedRelationField).contentType
    }
  }

  return undefined
}

const getRelatedRelationOptions = (
  contentType: EncodedContentType,
  currentSource: EncodedContentType,
) =>
  Object.entries(contentType.fields).flatMap(([name, field]) => {
    if (!isSelectableDynamicField(name, field)) return []

    const relationContentType = getRelationContentType(field)
    return relationContentType?.name === currentSource.name ? [name] : []
  })

const getRelatedPathOptions = (
  contentType: EncodedContentType,
  targetField: EncodedFieldUnknown,
) =>
  sourceFieldOptions(contentType, targetField).filter(
    (option) => option.kind === 'array' && option.value !== '$href',
  )

const getSortFieldOptions = (
  contentType: EncodedContentType,
): SourceFieldOption[] =>
  Object.entries(contentType.fields).flatMap(([name, field]) => {
    if (
      !isSelectableDynamicField(name, field) ||
      field.isTranslatable ||
      name.startsWith('_') ||
      isSeoPath(name)
    ) {
      return []
    }

    const kind = getFieldKind(field)
    const isSingleSelect =
      field.config.type === 'Select' &&
      !(field as { isMultiple?: boolean }).isMultiple
    const isSortable =
      (field.config.type === 'String' && field.config.ui !== 'RichText') ||
      field.config.type === 'Number' ||
      field.config.type === 'Boolean' ||
      field.config.type === 'Date' ||
      isSingleSelect

    return isSortable ? [{ label: fieldLabel(name), value: name, kind }] : []
  })

const filterOperatorOptions: Record<
  FilterOperator,
  { label: string; value: FilterOperator }
> = {
  equals: { label: 'Equals', value: 'equals' },
  notEquals: { label: 'Does not equal', value: 'notEquals' },
  contains: { label: 'Contains', value: 'contains' },
  in: { label: 'Is one of', value: 'in' },
  notIn: { label: 'Is not one of', value: 'notIn' },
  greaterThan: { label: 'Greater than', value: 'greaterThan' },
  greaterThanOrEqual: {
    label: 'Greater than or equal',
    value: 'greaterThanOrEqual',
  },
  lessThan: { label: 'Less than', value: 'lessThan' },
  lessThanOrEqual: {
    label: 'Less than or equal',
    value: 'lessThanOrEqual',
  },
  true: { label: 'Is true', value: 'true' },
  false: { label: 'Is false', value: 'false' },
  exists: { label: 'Is set', value: 'exists' },
  notExists: { label: 'Is not set', value: 'notExists' },
}

const getFilterOperatorOptions = (kind: SourceFieldKind | undefined) => {
  const operators: FilterOperator[] =
    kind === 'boolean'
      ? ['true', 'false', 'exists', 'notExists']
      : kind === 'number' || kind === 'date'
        ? [
            'equals',
            'notEquals',
            'greaterThan',
            'greaterThanOrEqual',
            'lessThan',
            'lessThanOrEqual',
            'in',
            'notIn',
            'exists',
            'notExists',
          ]
        : kind === 'string' || kind === 'richText'
          ? [
              'equals',
              'notEquals',
              'contains',
              'in',
              'notIn',
              'exists',
              'notExists',
            ]
          : ['equals', 'notEquals', 'exists', 'notExists']

  return operators.map((operator) => filterOperatorOptions[operator])
}

const defaultFilterOperator = (
  kind: SourceFieldKind | undefined,
): FilterOperator => (kind === 'boolean' ? 'true' : 'equals')

const createRelatedCollectionSource = ({
  contentType,
  currentSource,
  targetField,
}: {
  contentType: EncodedContentType
  currentSource: EncodedContentType
  targetField: EncodedFieldUnknown
}): DynamicRelatedCollectionSource | undefined => {
  const relation = getRelatedRelationOptions(contentType, currentSource)[0]
  const path = getRelatedPathOptions(contentType, targetField)[0]?.value
  if (!relation || !path) return undefined

  return {
    kind: 'relatedCollection',
    contentType: contentType.name,
    relation,
    path,
    limit: 10,
  }
}

const MappingSourceEditor = ({
  contentTypes,
  currentSource,
  targetField,
  source,
  onChange,
}: {
  contentTypes: EncodedContentType[]
  currentSource: EncodedContentType
  targetField: EncodedFieldUnknown
  source: ListMapSource
  onChange: (source: ListMapSource) => void
}) => {
  const relatedSource = isRelatedCollectionSource(source) ? source : undefined
  const directSource =
    source && !isRelatedCollectionSource(source) ? source : undefined
  const directFieldOptions = sourceFieldOptions(currentSource, targetField)
  const relatedContentTypes = contentTypes.filter(
    (contentType) =>
      getRelatedRelationOptions(contentType, currentSource).length > 0 &&
      getRelatedPathOptions(contentType, targetField).length > 0,
  )
  const selectedRelatedContentType = relatedSource
    ? relatedContentTypes.find(
        (contentType) => contentType.name === relatedSource.contentType,
      )
    : undefined
  const relationOptions = selectedRelatedContentType
    ? getRelatedRelationOptions(selectedRelatedContentType, currentSource)
    : []
  const pathOptions = selectedRelatedContentType
    ? getRelatedPathOptions(selectedRelatedContentType, targetField)
    : []
  const sortOptions = selectedRelatedContentType
    ? getSortFieldOptions(selectedRelatedContentType)
    : []
  const sortEntry = Object.entries(relatedSource?.sort ?? {})[0]
  const sortField = sortEntry?.[0] ?? ''
  const sortDirection = sortEntry?.[1] ?? 'desc'

  if (!relatedSource) {
    return (
      <div className='grid gap-3 md:grid-cols-[0.7fr_1.3fr]'>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Choose a direct field or query a related collection.'>
            Mapping mode
          </ControlLabel>
          <Select
            value='field'
            onValueChange={(value) => {
              if (value !== 'relatedCollection') return

              const next = relatedContentTypes
                .map((contentType) =>
                  createRelatedCollectionSource({
                    contentType,
                    currentSource,
                    targetField,
                  }),
                )
                .find(Boolean)
              onChange(next)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='field'>Direct field</SelectItem>
              {relatedContentTypes.length > 0 ? (
                <SelectItem value='relatedCollection'>Related collection</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Its value will be assigned to this mapped property.'>
            Field on {currentSource.name}
          </ControlLabel>
          <Select
            disabled={directFieldOptions.length === 0}
            value={sourceValue(directSource)}
            onValueChange={(value) =>
              onChange(createSource(currentSource.name, value))
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  directFieldOptions.length > 0
                    ? 'Select a source field'
                    : 'No compatible fields'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {directFieldOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className='grid gap-3'>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Query records related to the current source item.'>
            Mapping mode
          </ControlLabel>
          <Select
            value='relatedCollection'
            onValueChange={() => onChange(undefined)}
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='field'>Direct field</SelectItem>
              <SelectItem value='relatedCollection'>Related collection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Content type whose records will be searched.'>
            Collection to query
          </ControlLabel>
          <Select
            disabled={relatedContentTypes.length === 0}
            value={relatedSource.contentType}
            onValueChange={(value) => {
              const contentType = relatedContentTypes.find(
                (item) => item.name === value,
              )
              if (!contentType) return

              onChange(
                createRelatedCollectionSource({
                  contentType,
                  currentSource,
                  targetField,
                }),
              )
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  relatedContentTypes.length > 0
                    ? 'Select a content type'
                    : 'No compatible collections'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {relatedContentTypes.map((contentType) => (
                <SelectItem key={contentType.name} value={contentType.name}>
                  {contentType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel
            help={`Field on ${relatedSource.contentType} that points to ${currentSource.name}.`}
          >
            Relation to {currentSource.name}
          </ControlLabel>
          <Select
            disabled={relationOptions.length === 0}
            value={relatedSource.relation}
            onValueChange={(relation) => onChange({ ...relatedSource, relation })}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  relationOptions.length > 0
                    ? 'Select a relation field'
                    : 'No compatible relations'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {relationOptions.map((relation) => (
                <SelectItem key={relation} value={relation}>
                  {relation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Arrays from matching records are flattened into one result.'>
            Array field to collect
          </ControlLabel>
          <Select
            disabled={pathOptions.length === 0}
            value={relatedSource.path}
            onValueChange={(path) => onChange({ ...relatedSource, path })}
          >
            <SelectTrigger className='w-full'>
              <SelectValue
                placeholder={
                  pathOptions.length > 0
                    ? 'Select an array field'
                    : 'No compatible array fields'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {pathOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='grid gap-3 sm:grid-cols-[0.7fr_1fr_0.7fr]'>
        <div className='grid content-start gap-1.5'>
          <ControlLabel
            help={`Number of ${relatedSource.contentType} records queried per ${currentSource.name}. Minimum 1, maximum 100.`}
          >
            Maximum related records
          </ControlLabel>
          <Input
            type='number'
            min={1}
            max={100}
            value={String(relatedSource.limit)}
            onChange={(event) =>
              onChange({
                ...relatedSource,
                limit: Math.min(
                  100,
                  Math.max(1, Number(event.target.value || 10)),
                ),
              })
            }
          />
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Optional. Only direct scalar fields can be used.'>
            Sort related records by
          </ControlLabel>
          <Select
            value={sortField || '__none__'}
            onValueChange={(value) =>
              onChange({
                ...relatedSource,
                sort:
                  value === '__none__'
                    ? undefined
                    : { [value]: sortDirection },
              })
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='No sort' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none__'>No sort</SelectItem>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='grid content-start gap-1.5'>
          <ControlLabel help='Applied before collecting and flattening the arrays.'>
            Sort direction
          </ControlLabel>
          <Select
            disabled={!sortField}
            value={sortDirection}
            onValueChange={(direction) =>
              sortField
                ? onChange({
                    ...relatedSource,
                    sort: { [sortField]: direction as 'asc' | 'desc' },
                  })
                : undefined
            }
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='asc'>Ascending</SelectItem>
              <SelectItem value='desc'>Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

const ListBindingEditor = ({
  contentTypes,
  documentContentType,
  currentDocumentSourceEnabled,
  field,
  binding,
  onChange,
}: {
  contentTypes: EncodedContentType[]
  documentContentType: EncodedContentType
  currentDocumentSourceEnabled: boolean
  field: EncodedListField
  binding: DynamicListBinding | undefined
  onChange: (binding: DynamicListBinding | undefined) => void
}) => {
  const itemOptions = field.fields.filter(
    (item) => item.name !== ITERATOR_FIELD_NAME,
  )
  const documentSourceOptions = currentDocumentSourceEnabled
    ? currentDocumentListSourceOptions(documentContentType)
    : []
  const initialDocumentSource = binding?.source
    ? documentSourceOptions.find(
        (option) =>
          option.path === binding.source?.path &&
          option.itemName === binding.source?.itemName,
      )
    : undefined
  const [sourceType, setSourceType] = useState(
    initialDocumentSource?.value || binding?.contentType || '',
  )
  const [itemName, setItemName] = useState(
    binding?.itemName || itemOptions[0]?.name || '',
  )
  const [filterState, setFilterState] = useState<FilterState>(
    readFilterState(binding?.query?.filter),
  )
  const [openMappingField, setOpenMappingField] = useState<string | null>(null)
  const selectedDocumentSource = documentSourceOptions.find(
    (option) => option.value === sourceType,
  )
  const selectedSource =
    selectedDocumentSource?.contentType ??
    contentTypes.find((ct) => ct.name === sourceType)
  const targetContentType = getListTargetContentType(field, itemName)
  const targetFields = useMemo(
    () =>
      targetContentType
        ? Object.entries(targetContentType.fields).filter(
            ([targetFieldName, targetField]) =>
              isSelectableDynamicField(targetFieldName, targetField),
          )
        : [],
    [targetContentType],
  )
  const sortFieldOptions = selectedSource
    ? getSortFieldOptions(selectedSource)
    : []
  const filterFieldOptions = selectedSource
    ? sourceFieldOptions(selectedSource).filter((item) => item.value !== '$href')
    : []
  const currentDocumentFieldOptions: SourceFieldOption[] = [
    { label: '_id', value: '_id', kind: 'string' },
    ...sourceFieldOptions(documentContentType).filter(
      (item) =>
        item.value !== '$href' &&
        item.kind !== 'object' &&
        item.kind !== 'array',
    ),
  ]
  const sortEntry = Object.entries(binding?.query?.options?.sort ?? {})[0]
  const sortField = sortEntry?.[0] ?? ''
  const sortDirection = sortEntry?.[1] ?? 'desc'

  const emit = (patch: Partial<DynamicListBinding>) => {
    const source = selectedDocumentSource
      ? ({
          kind: 'currentDocument',
          contentType: documentContentType.name,
          path: selectedDocumentSource.path,
          itemName: selectedDocumentSource.itemName,
        } satisfies DynamicListDocumentSource)
      : undefined
    const next = {
      contentType: selectedSource?.name ?? '',
      source,
      itemName,
      map: binding?.map ?? {},
      query: source
        ? undefined
        : (binding?.query ?? { options: { limit: 10 } }),
      ...patch,
    }

    if (!next.contentType || !next.itemName) {
      onChange(undefined)
      return
    }

    onChange(next)
  }

  const updateFilter = (nextFilterState: FilterState) => {
    setFilterState(nextFilterState)
    emit({
      query: {
        ...binding?.query,
        filter: buildFilter(nextFilterState, filterFieldOptions),
      },
    })
  }

  const updateFilterCondition = (
    index: number,
    nextCondition: FilterCondition,
  ) => {
    const conditions = [...filterState.conditions]
    conditions[index] = nextCondition
    updateFilter({ ...filterState, conditions })
  }

  return (
    <div className='grid gap-3'>
      <PanelSection title='Collection'>
        <div className='grid gap-3 md:grid-cols-2'>
          <Label className='grid gap-1.5'>
            Source
            <Select
              disabled={
                contentTypes.length === 0 && documentSourceOptions.length === 0
              }
              value={sourceType}
              onValueChange={(value) => {
                const documentSource = documentSourceOptions.find(
                  (option) => option.value === value,
                )
                setSourceType(value)
                const nextFilterState: FilterState = {
                  combinator: 'and',
                  conditions: [],
                }
                setFilterState(nextFilterState)
                onChange({
                  contentType: documentSource?.contentType.name ?? value,
                  source: documentSource
                    ? {
                        kind: 'currentDocument',
                        contentType: documentContentType.name,
                        path: documentSource.path,
                        itemName: documentSource.itemName,
                      }
                    : undefined,
                  itemName,
                  map: {},
                  query: documentSource
                    ? undefined
                    : {
                        options: {
                          limit: binding?.query?.options?.limit ?? 10,
                        },
                      },
                })
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue
                  placeholder={
                    contentTypes.length > 0 || documentSourceOptions.length > 0
                      ? 'Content type or document list'
                      : 'No compatible sources'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {documentSourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  {contentTypes.map((ct) => (
                    <SelectItem key={ct.name} value={ct.name}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Label>
          <Label className='grid gap-1.5'>
            Item
            <Select
              disabled={!sourceType || itemOptions.length === 0}
              value={itemName}
              onValueChange={(value) => {
                setItemName(value)
                emit({ itemName: value, map: {} })
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue
                  placeholder={
                    itemOptions.length > 0 ? 'Item type' : 'No item types'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {itemOptions.map((item) => (
                    <SelectItem key={item.name} value={item.name}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Label>
        </div>
      </PanelSection>

      {selectedDocumentSource ? null : (
        <PanelSection title='Query'>
          <div className='grid grid-cols-[minmax(5rem,0.4fr)_minmax(0,1.2fr)_minmax(8rem,0.6fr)] items-end gap-3'>
          <Label className='grid gap-1.5'>
            Limit
            <Input
              type='number'
              min={1}
              max={100}
              value={String(binding?.query?.options?.limit ?? 10)}
              onChange={(event) =>
                emit({
                  query: {
                    ...binding?.query,
                    options: {
                      ...binding?.query?.options,
                      limit: Math.min(
                        100,
                        Math.max(1, Number(event.target.value || 10)),
                      ),
                    },
                  },
                })
              }
            />
          </Label>
          <Label className='grid min-w-0 gap-1.5'>
            Sort by
            <Select
              disabled={sortFieldOptions.length === 0}
              value={sortField || '__none__'}
              onValueChange={(value) =>
                emit({
                  query: {
                    ...binding?.query,
                    options: {
                      ...binding?.query?.options,
                      sort:
                        value === '__none__'
                          ? undefined
                          : { [value]: sortDirection },
                    },
                  },
                })
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue
                  placeholder={
                    sortFieldOptions.length > 0
                      ? 'Sort by field'
                      : 'No sortable fields'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value='__none__'>No sort</SelectItem>
                  {sortFieldOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Label>
          <Label className='grid gap-1.5'>
            Direction
            <Select
              disabled={!sortField}
              value={sortDirection}
              onValueChange={(direction) =>
                sortField
                  ? emit({
                      query: {
                        ...binding?.query,
                        options: {
                          ...binding?.query?.options,
                          sort: {
                            [sortField]: direction as 'asc' | 'desc',
                          },
                        },
                      },
                    })
                  : undefined
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='asc'>Ascending</SelectItem>
                <SelectItem value='desc'>Descending</SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>

        <div className='grid gap-3 rounded-md border border-border bg-background/60 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <div className='text-sm font-medium'>Conditions</div>
              <div className='text-xs text-muted-foreground'>
                Filter the records used to build this list.
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {filterState.conditions.length > 1 ? (
                <Select
                  value={filterState.combinator}
                  onValueChange={(combinator) =>
                    updateFilter({
                      ...filterState,
                      combinator: combinator as 'and' | 'or',
                    })
                  }
                >
                  <SelectTrigger className='h-8 w-36'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='and'>Match all</SelectItem>
                    <SelectItem value='or'>Match any</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={
                  filterFieldOptions.length === 0 ||
                  filterState.conditions.length >= 25
                }
                onClick={() =>
                  updateFilter({
                    ...filterState,
                    conditions: [
                      ...filterState.conditions,
                      { field: '', operator: 'equals', value: '' },
                    ],
                  })
                }
              >
                <Plus className='h-4 w-4' />
                Add condition
              </Button>
            </div>
          </div>

          {filterState.conditions.length === 0 ? (
            <div className='rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground'>
              No conditions. All records from this collection will match.
            </div>
          ) : (
            <div className='grid gap-2'>
              {filterState.conditions.map((condition, index) => {
                const fieldOption = filterFieldOptions.find(
                  (option) => option.value === condition.field,
                )
                const operatorOptions = getFilterOperatorOptions(
                  fieldOption?.kind,
                )
                const needsValue = operatorNeedsValue(condition.operator)
                const currentValueOptions = currentDocumentFieldOptions.filter(
                  (option) =>
                    !fieldOption || option.kind === fieldOption.kind,
                )
                const allowsCurrentValue =
                  condition.operator !== 'in' &&
                  condition.operator !== 'notIn' &&
                  currentValueOptions.length > 0

                return (
                  <div
                    key={`${index}-${condition.field}`}
                    className='grid items-center gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-[1.2fr_1fr_1.8fr_auto]'
                  >
                    <Select
                      disabled={filterFieldOptions.length === 0}
                      value={condition.field}
                      onValueChange={(value) => {
                        const kind = filterFieldOptions.find(
                          (option) => option.value === value,
                        )?.kind
                        updateFilterCondition(index, {
                          field: value,
                          operator: defaultFilterOperator(kind),
                          value: '',
                        })
                      }}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Field' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {filterFieldOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    <Select
                      disabled={!condition.field}
                      value={condition.operator}
                      onValueChange={(operator) =>
                        updateFilterCondition(index, {
                          ...condition,
                          operator: operator as FilterOperator,
                          valueSource:
                            operator === 'in' || operator === 'notIn'
                              ? 'literal'
                              : condition.valueSource,
                          value: operatorNeedsValue(
                            operator as FilterOperator,
                          )
                            ? operator === 'in' || operator === 'notIn'
                              ? ''
                              : condition.value
                            : '',
                        })
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Operator' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {operatorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {needsValue ? (
                      <div className='grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)] gap-2'>
                        <Select
                          value={condition.valueSource ?? 'literal'}
                          onValueChange={(valueSource) =>
                            updateFilterCondition(index, {
                              ...condition,
                              valueSource: valueSource as
                                | 'literal'
                                | 'current',
                              value: '',
                            })
                          }
                        >
                          <SelectTrigger
                            className='w-full'
                            aria-label='Value source'
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='literal'>Fixed value</SelectItem>
                            {allowsCurrentValue ? (
                              <SelectItem value='current'>
                                Current document
                              </SelectItem>
                            ) : null}
                          </SelectContent>
                        </Select>
                        {condition.valueSource === 'current' ? (
                          <Select
                            disabled={!condition.field}
                            value={condition.value}
                            onValueChange={(value) =>
                              updateFilterCondition(index, {
                                ...condition,
                                value,
                              })
                            }
                          >
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Current field' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {currentValueOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={
                              fieldOption?.kind === 'number' &&
                              condition.operator !== 'in' &&
                              condition.operator !== 'notIn'
                                ? 'number'
                                : 'text'
                            }
                            value={condition.value}
                            disabled={!condition.field}
                            placeholder={
                              condition.operator === 'in' ||
                              condition.operator === 'notIn'
                                ? 'Comma-separated values'
                                : 'Value'
                            }
                            onChange={(event) =>
                              updateFilterCondition(index, {
                                ...condition,
                                value: event.target.value,
                              })
                            }
                          />
                        )}
                      </div>
                    ) : (
                      <div className='h-9 rounded-md border border-dashed border-border bg-muted/30' />
                    )}

                    <Button
                      type='button'
                      size='icon'
                      variant='ghost'
                      className='size-9 text-muted-foreground hover:text-destructive'
                      onClick={() =>
                        updateFilter({
                          ...filterState,
                          conditions: filterState.conditions.filter(
                            (_, conditionIndex) => conditionIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 className='h-4 w-4' />
                      <span className='sr-only'>Remove condition</span>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </PanelSection>
      )}

      <PanelSection title='Mapping'>
        <div className='grid gap-2'>
          {targetFields.map(([targetField, targetFieldConfig]) => {
            const source = binding?.map?.[targetField]
            const summary = mappingSourceSummary(
              source,
              selectedSource?.name ?? 'Source',
            )
            const isOpen = openMappingField === targetField

            return (
              <Collapsible
                key={targetField}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenMappingField(open ? targetField : null)
                }
              >
                <div className='overflow-hidden rounded-md border border-border bg-background/70 transition-colors hover:border-foreground/20'>
                  <CollapsibleTrigger asChild>
                    <button
                      type='button'
                      disabled={!selectedSource}
                      className='group grid w-full grid-cols-[minmax(6rem,0.45fr)_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      <span className='truncate text-sm font-semibold'>
                        {targetField}
                      </span>
                      <Badge
                        variant={source ? 'secondary' : 'outline'}
                        className='max-w-40 truncate'
                      >
                        {summary.mode}
                      </Badge>
                      <span className='truncate text-sm text-muted-foreground'>
                        {selectedSource
                          ? summary.detail
                          : 'Select a source collection first'}
                      </span>
                      <ChevronRight className='h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90' />
                      <span className='sr-only'>Configure {targetField} mapping</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className='border-t border-border bg-muted/20 p-3'>
                      {selectedSource ? (
                        <MappingSourceEditor
                          contentTypes={contentTypes}
                          currentSource={selectedSource}
                          targetField={targetFieldConfig}
                          source={source}
                          onChange={(nextSource) => {
                            const map = { ...(binding?.map ?? {}) }
                            if (nextSource) map[targetField] = nextSource
                            else delete map[targetField]
                            emit({ map })
                          }}
                        />
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      </PanelSection>
    </div>
  )
}

export const DynamicDataControl = ({
  contentType,
  documentContentType,
  fieldName,
  field,
  contentTypes,
  bindings,
  onChange,
  open,
  onOpenChange,
  mode = 'full',
}: {
  contentType: EncodedContentType
  documentContentType?: EncodedContentType
  fieldName: string
  field: EncodedFieldUnknown
  contentTypes: EncodedContentType[]
  bindings: DynamicDocumentBindings | undefined
  onChange: (bindings: DynamicDocumentBindings | undefined) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  mode?: 'full' | 'trigger' | 'panel' | 'dialog'
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [draftBindings, setDraftBindings] = useState<
    DynamicDocumentBindings | undefined
  >(() => cloneDynamicBindings(bindings))
  const wasOpenRef = useRef(open ?? internalOpen)

  const list = isListField(field)
  const isOpen = open ?? internalOpen

  useEffect(() => {
    if (mode !== 'dialog') return

    const wasOpen = wasOpenRef.current

    if (!isOpen || !wasOpen) {
      setDraftBindings(cloneDynamicBindings(bindings))
    }

    wasOpenRef.current = isOpen
  }, [bindings, isOpen, mode])

  if (!isDynamicFieldEnabled(contentType, field)) return null

  const setOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(isOpen) : next

    if (onOpenChange) {
      onOpenChange(value)
      return
    }

    setInternalOpen(value)
  }
  const activeBindings = mode === 'dialog' ? draftBindings : bindings
  const commitBindings =
    mode === 'dialog'
      ? (nextBindings: DynamicDocumentBindings | undefined) =>
          setDraftBindings(cleanDynamicBindings(nextBindings))
      : (nextBindings: DynamicDocumentBindings | undefined) =>
          onChange(cleanDynamicBindings(nextBindings))
  const sourceContentTypes = getSourceContentTypes(contentTypes)
  const currentDocumentContentType = documentContentType ?? contentType
  const currentDocumentSourceEnabled =
    currentDocumentContentType.name !== contentType.name
  const fieldSourceContentTypes = currentDocumentSourceEnabled
    ? [
        currentDocumentContentType,
        ...sourceContentTypes.filter(
          (sourceContentType) =>
            sourceContentType.name !== currentDocumentContentType.name,
        ),
      ]
    : sourceContentTypes.filter(
        (sourceContentType) => sourceContentType.name !== contentType.name,
      )
  const fieldBinding = activeBindings?.fields?.[fieldName]
  const listBinding = activeBindings?.lists?.[fieldName]
  const bound = list ? !!listBinding : !!fieldBinding
  const summary = bindingSummary({
    list,
    fieldBinding,
    listBinding,
    documentContentTypeName: currentDocumentContentType.name,
  })
  const updateFieldBinding = (binding: FieldBinding) => {
    const fields = { ...(activeBindings?.fields ?? {}) }
    if (binding) fields[fieldName] = binding
    else delete fields[fieldName]
    commitBindings({
      ...(activeBindings ?? {}),
      fields: Object.keys(fields).length ? fields : undefined,
    })
  }
  const updateListBinding = (binding: DynamicListBinding | undefined) => {
    const lists = { ...(activeBindings?.lists ?? {}) }
    if (binding) lists[fieldName] = binding
    else delete lists[fieldName]
    commitBindings({
      ...(activeBindings ?? {}),
      lists: Object.keys(lists).length ? lists : undefined,
    })
  }
  const clearBinding = () =>
    list ? updateListBinding(undefined) : updateFieldBinding(undefined)
  const triggerLabel = bound ? 'Edit dynamic data link' : 'Link dynamic data'
  const helpDescription = list
    ? 'Dynamic data fills this list from another content source. Use it when modules should stay synced with page, route, or related content instead of being edited manually here.'
    : 'Dynamic data fills this field from another content source. Use it when this value should stay synced with page, route, or related content instead of being edited manually here.'
  const cancelDialogChanges = () => {
    setDraftBindings(cloneDynamicBindings(bindings))
    setOpen(false)
  }
  const saveDialogChanges = () => {
    onChange(cleanDynamicBindings(draftBindings))
    setOpen(false)
  }

  const trigger = (
    <div className='flex min-w-0 items-center gap-1.5'>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            className='min-w-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            onClick={() => setOpen((value) => !value)}
          >
            {bound && summary ? (
              <Badge
                variant='secondary'
                className='max-w-80 min-w-0 gap-1.5 rounded-md px-2 py-1 hover:bg-secondary/80'
              >
                {list ? (
                  <ListFilter className='h-3.5 w-3.5 shrink-0' />
                ) : (
                  <Link2 className='h-3.5 w-3.5 shrink-0' />
                )}
                <span className='truncate'>{summary}</span>
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='gap-1.5 rounded-md px-2 py-1 text-muted-foreground'
              >
                <Cable className='h-3.5 w-3.5' />
                Not linked
              </Badge>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side='top' sideOffset={6}>
          {triggerLabel}
        </TooltipContent>
      </Tooltip>
      {bound ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='size-6'
              onClick={clearBinding}
            >
              <X className='h-4 w-4' />
              <span className='sr-only'>Clear dynamic data</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top' sideOffset={6}>
            Clear dynamic data link
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )

  const editor = list ? (
    <ListBindingEditor
      contentTypes={sourceContentTypes}
      documentContentType={currentDocumentContentType}
      currentDocumentSourceEnabled={currentDocumentSourceEnabled}
      field={field as EncodedListField}
      binding={listBinding}
      onChange={updateListBinding}
    />
  ) : (
    <FieldBindingEditor
      contentTypes={fieldSourceContentTypes}
      documentContentType={currentDocumentContentType}
      currentDocumentSourceEnabled={currentDocumentSourceEnabled}
      targetField={field}
      binding={fieldBinding}
      onChange={updateFieldBinding}
    />
  )

  const panel = isOpen ? (
    <div className='rounded-md border border-border bg-background p-4 shadow-sm'>
      {editor}
    </div>
  ) : null

  const dialog = (
    <Dialog
      open={isOpen}
      onOpenChange={(value) => {
        if (value) {
          setOpen(true)
          return
        }

        cancelDialogChanges()
      }}
    >
      <DialogContent className='max-h-[85vh] w-screen max-w-5xl! overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            Dynamic data
            <HelpCircle className='h-4 w-4 text-muted-foreground' />
          </DialogTitle>
          <DialogDescription className='max-w-2xl leading-relaxed'>
            {helpDescription}
          </DialogDescription>
        </DialogHeader>
        {editor}
        <DialogFooter>
          <Button type='button' variant='outline' onClick={cancelDialogChanges}>
            Cancel
          </Button>
          <Button type='button' onClick={saveDialogChanges}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (mode === 'trigger') return trigger
  if (mode === 'panel') return panel
  if (mode === 'dialog') return dialog

  return (
    <div className='grid min-w-0 gap-2'>
      <div className='flex min-w-0 justify-end'>{trigger}</div>
      {panel}
    </div>
  )
}
