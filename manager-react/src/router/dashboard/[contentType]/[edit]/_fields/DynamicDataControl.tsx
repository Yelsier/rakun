'use client'

import type {
  DynamicBindingSource,
  DynamicDocumentBindings,
  DynamicListBinding,
  EncodedContentType,
  EncodedFieldUnknown,
  EncodedListField,
  EncodedRelationField,
} from '@rakun-kit/core/client'
import {
  getListField,
  isDynamicDataSourceContentTypeAllowed,
  isTranslatableObject,
} from '@rakun-kit/core/client'
import { Cable, Link2, ListFilter, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useManagerQuery } from '@/client/react'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type FieldBinding = DynamicBindingSource | undefined
type FilterOperator = 'equals' | 'contains' | 'true' | 'false'
type FilterState = {
  field: string
  operator: FilterOperator
  value: string
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isListField = (field: EncodedFieldUnknown) =>
  field.config.ui === 'List' || field.config.ui === 'Iterator'

export const isDynamicFieldEnabled = (
  contentType: EncodedContentType,
  fieldName: string,
  field: EncodedFieldUnknown,
) => {
  const dynamicData = contentType.dynamicData
  if (!dynamicData || field.visibility !== 'all') return false
  if (dynamicData === true) return true

  return isListField(field)
    ? (dynamicData.lists ?? []).includes(fieldName)
    : (dynamicData.fields ?? []).includes(fieldName)
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

const fieldLabel = (path: string) =>
  path.startsWith('_seo.') ? `seo.${path.slice('_seo.'.length)}` : path

const isSeoPath = (path: string) =>
  path === '_seo' ||
  path === 'seo' ||
  path.startsWith('_seo.') ||
  path.startsWith('seo.')

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
    if (field.visibility !== 'all') return []

    const path = prefix ? `${prefix}.${name}` : name
    const kind = getFieldKind(field)

    if (isSeoPath(path)) return []

    if (field.config.type === 'Relation' && depth < 3) {
      const relationContentType = (field as EncodedRelationField).contentType

      return nestedSourceFieldOptions({
        contentType: relationContentType,
        prefix: path,
        targetField,
        depth: depth + 1,
      })
    }

    if (field.config.type === 'File') {
      return fileFieldOptions(path, targetField)
    }

    if (!isCompatibleSourceKind(kind, targetField)) return []

    return [
      {
        label: fieldLabel(path),
        value: path,
        kind,
      },
    ]
  })

const sourceFieldOptions = (
  contentType?: EncodedContentType,
  targetField?: EncodedFieldUnknown,
) => {
  if (!contentType) return []

  const fields = nestedSourceFieldOptions({ contentType, targetField })
  const includeHref =
    contentType.routes?.some((route) => route.hasPage) &&
    isCompatibleSourceKind('string', targetField)

  return includeHref
    ? [{ label: 'href', value: '$href', kind: 'string' }, ...fields]
    : fields
}

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

const getSourceContentTypes = (
  contentType: EncodedContentType,
  contentTypes: EncodedContentType[],
) =>
  contentTypes.filter((sourceContentType) =>
    isDynamicDataSourceContentTypeAllowed(
      contentType.dynamicData,
      sourceContentType,
    ),
  )

const readFilterState = (
  filter: Record<string, unknown> | undefined,
): FilterState | undefined => {
  const entry = filter ? Object.entries(filter)[0] : undefined
  if (!entry) return undefined

  const [field, value] = entry
  if (value === true) return { field, operator: 'true', value: '' }
  if (value === false) return { field, operator: 'false', value: '' }
  if (isRecord(value) && typeof value.$contains === 'string') {
    return { field, operator: 'contains', value: value.$contains }
  }

  return {
    field,
    operator: 'equals',
    value: typeof value === 'string' ? value : String(value ?? ''),
  }
}

const buildFilter = (state: FilterState | undefined) => {
  if (!state?.field) return undefined
  if (state.operator === 'true') return { [state.field]: true }
  if (state.operator === 'false') return { [state.field]: false }
  if (!state.value.trim()) return undefined
  if (state.operator === 'contains') {
    return { [state.field]: { $contains: state.value } }
  }

  return { [state.field]: state.value }
}

const filterSummary = (filter: Record<string, unknown> | undefined) => {
  const state = readFilterState(filter)
  if (!state) return ''
  if (state.operator === 'true') return `${state.field} = true`
  if (state.operator === 'false') return `${state.field} = false`
  if (state.operator === 'contains') return `${state.field} contains ${state.value}`

  return `${state.field} = ${state.value}`
}

const bindingSummary = ({
  list,
  fieldBinding,
  listBinding,
}: {
  list: boolean
  fieldBinding?: DynamicBindingSource
  listBinding?: DynamicListBinding
}) => {
  if (list) {
    if (!listBinding) return ''

    const limit = listBinding.query?.options?.limit ?? 10
    const filter = filterSummary(listBinding.query?.filter)

    return [
      `${listBinding.contentType} -> ${listBinding.itemName}`,
      `limit ${limit}`,
      filter,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  if (!fieldBinding) return ''

  return `${fieldBinding.contentType} -> ${sourceLabel(fieldBinding)}`
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

const FieldBindingEditor = ({
  contentTypes,
  targetField,
  binding,
  onChange,
}: {
  contentTypes: EncodedContentType[]
  targetField: EncodedFieldUnknown
  binding: FieldBinding
  onChange: (binding: FieldBinding) => void
}) => {
  const { language } = useLanguage()
  const [sourceType, setSourceType] = useState(binding?.contentType || '')
  const [sourceId, setSourceId] = useState(binding?.id || '')
  const [fieldPath, setFieldPath] = useState(sourceValue(binding))
  const selectedContentType = contentTypes.find((ct) => ct.name === sourceType)
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
    enabled: !!sourceType,
  })
  const items = ((sourceItemsQuery.data as
    | { items?: Array<Record<string, unknown> & { _id: string }> }
    | undefined)?.items ?? []) as Array<Record<string, unknown> & { _id: string }>

  const emit = (nextType = sourceType, nextId = sourceId, nextPath = fieldPath) => {
    if (!nextType || !nextId || !nextPath) {
      onChange(undefined)
      return
    }

    onChange(createSource(nextType, nextPath, nextId))
  }

  return (
    <PanelSection title='Source value'>
      <div className='grid gap-3 md:grid-cols-[1fr_1.4fr_1fr]'>
        <Label className='grid gap-1.5'>
          Source
          <Select
            value={sourceType}
            onValueChange={(value) => {
              setSourceType(value)
              setSourceId('')
              setFieldPath('')
              onChange(undefined)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Content type' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
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
            value={sourceId}
            onValueChange={(value) => {
              setSourceId(value)
              emit(sourceType, value, fieldPath)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Item' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
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
            value={fieldPath}
            onValueChange={(value) => {
              setFieldPath(value)
              emit(sourceType, sourceId, value)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Field' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sourceFieldOptions(selectedContentType, targetField).map(
                  (field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ),
                )}
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

const ListBindingEditor = ({
  contentTypes,
  field,
  binding,
  onChange,
}: {
  contentTypes: EncodedContentType[]
  field: EncodedListField
  binding: DynamicListBinding | undefined
  onChange: (binding: DynamicListBinding | undefined) => void
}) => {
  const [sourceType, setSourceType] = useState(binding?.contentType || '')
  const [itemName, setItemName] = useState(
    binding?.itemName || field.fields[0]?.name || '',
  )
  const [filterState, setFilterState] = useState<FilterState | undefined>(
    readFilterState(binding?.query?.filter),
  )
  const selectedSource = contentTypes.find((ct) => ct.name === sourceType)
  const targetContentType = getListTargetContentType(field, itemName)
  const targetFields = useMemo(
    () =>
      targetContentType
        ? Object.entries(targetContentType.fields).filter(
            ([, targetField]) => targetField.visibility === 'all',
          )
        : [],
    [targetContentType],
  )

  const emit = (patch: Partial<DynamicListBinding>) => {
    const next = {
      contentType: sourceType,
      itemName,
      map: binding?.map ?? {},
      query: binding?.query ?? { options: { limit: 10 } },
      ...patch,
    }

    if (!next.contentType || !next.itemName) {
      onChange(undefined)
      return
    }

    onChange(next)
  }

  const updateFilter = (nextFilterState: FilterState | undefined) => {
    setFilterState(nextFilterState)
    emit({
      query: {
        ...binding?.query,
        filter: buildFilter(nextFilterState),
      },
    })
  }

  return (
    <div className='grid gap-3'>
      <PanelSection title='Collection'>
        <div className='grid gap-3 md:grid-cols-2'>
          <Label className='grid gap-1.5'>
            Source
            <Select
              value={sourceType}
              onValueChange={(value) => {
                setSourceType(value)
                emit({ contentType: value, map: {} })
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Content type' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
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
              value={itemName}
              onValueChange={(value) => {
                setItemName(value)
                emit({ itemName: value, map: {} })
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Item type' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {field.fields.map((item) => (
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

      <PanelSection title='Query'>
        <div className='grid gap-3 md:grid-cols-[0.7fr_1fr_1.1fr]'>
          <Label className='grid gap-1.5'>
            Limit
            <Input
              type='number'
              min={1}
              value={String(binding?.query?.options?.limit ?? 10)}
              onChange={(event) =>
                emit({
                  query: {
                    ...binding?.query,
                    options: {
                      ...binding?.query?.options,
                      limit: Number(event.target.value || 10),
                    },
                  },
                })
              }
            />
          </Label>
          <Label className='grid gap-1.5'>
            Sort
            <Select
              value={Object.keys(binding?.query?.options?.sort ?? {})[0] ?? ''}
              onValueChange={(value) =>
                emit({
                  query: {
                    ...binding?.query,
                    options: {
                      ...binding?.query?.options,
                      sort: value ? { [value]: 'desc' } : undefined,
                    },
                  },
                })
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Field' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sourceFieldOptions(selectedSource)
                    .filter((item) => item.value !== '$href')
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Label>
          <div className='grid gap-1.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-medium'>Filter</span>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='size-7'
                onClick={() => updateFilter(undefined)}
              >
                <X className='h-4 w-4' />
                <span className='sr-only'>Clear filter</span>
              </Button>
            </div>
            <div className='grid gap-2 sm:grid-cols-[1fr_0.9fr_1fr]'>
              <Select
                value={filterState?.field || ''}
                onValueChange={(value) =>
                  updateFilter(
                    value
                      ? {
                          field: value,
                          operator: filterState?.operator ?? 'equals',
                          value: filterState?.value ?? '',
                        }
                      : undefined,
                  )
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Field' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sourceFieldOptions(selectedSource)
                      .filter((item) => item.value !== '$href')
                      .map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={filterState?.operator || 'equals'}
                onValueChange={(value) =>
                  filterState
                    ? updateFilter({
                        ...filterState,
                        operator: value as FilterOperator,
                        value:
                          value === 'true' || value === 'false'
                            ? ''
                            : filterState.value,
                      })
                    : undefined
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Operator' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='equals'>equals</SelectItem>
                    <SelectItem value='contains'>contains</SelectItem>
                    <SelectItem value='true'>true</SelectItem>
                    <SelectItem value='false'>false</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {filterState?.operator === 'true' ||
              filterState?.operator === 'false' ? (
                <div className='h-9 rounded-md border border-dashed border-border bg-background/60' />
              ) : (
                <Input
                  value={filterState?.value ?? ''}
                  disabled={!filterState?.field}
                  onChange={(event) =>
                    filterState
                      ? updateFilter({
                          ...filterState,
                          value: event.target.value,
                        })
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </div>
      </PanelSection>

      <PanelSection title='Mapping'>
        <div className='grid gap-2'>
          {targetFields.map(([targetField, targetFieldConfig]) => {
            const source = binding?.map?.[targetField]

            return (
              <div
                key={targetField}
                className='grid items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 md:grid-cols-[minmax(8rem,0.7fr)_auto_minmax(12rem,1.3fr)]'
              >
                <span className='truncate text-sm font-medium'>
                  {targetField}
                </span>
                <span className='hidden text-xs text-muted-foreground md:block'>
                  {'->'}
                </span>
                <Select
                  value={sourceValue(source)}
                  onValueChange={(value) =>
                    emit({
                      map: {
                        ...binding?.map,
                        [targetField]: createSource(sourceType, value),
                      },
                    })
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Source field' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sourceFieldOptions(selectedSource, targetFieldConfig).map(
                        (item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>
      </PanelSection>
    </div>
  )
}

export const DynamicDataControl = ({
  contentType,
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

  if (!isDynamicFieldEnabled(contentType, fieldName, field)) return null

  const isOpen = open ?? internalOpen
  const setOpen = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(isOpen) : next

    if (onOpenChange) {
      onOpenChange(value)
      return
    }

    setInternalOpen(value)
  }
  const list = isListField(field)
  const sourceContentTypes = getSourceContentTypes(contentType, contentTypes)
  const fieldBinding = bindings?.fields?.[fieldName]
  const listBinding = bindings?.lists?.[fieldName]
  const bound = list ? !!listBinding : !!fieldBinding
  const summary = bindingSummary({ list, fieldBinding, listBinding })
  const updateFieldBinding = (binding: FieldBinding) => {
    const fields = { ...(bindings?.fields ?? {}) }
    if (binding) fields[fieldName] = binding
    else delete fields[fieldName]
    onChange({
      ...(bindings ?? {}),
      fields: Object.keys(fields).length ? fields : undefined,
    })
  }
  const updateListBinding = (binding: DynamicListBinding | undefined) => {
    const lists = { ...(bindings?.lists ?? {}) }
    if (binding) lists[fieldName] = binding
    else delete lists[fieldName]
    onChange({
      ...(bindings ?? {}),
      lists: Object.keys(lists).length ? lists : undefined,
    })
  }
  const clearBinding = () =>
    list ? updateListBinding(undefined) : updateFieldBinding(undefined)

  const trigger = (
    <div className='flex min-w-0 items-center gap-1'>
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
      {bound ? (
        <Button
          type='button'
          size='icon'
          variant='ghost'
          className='size-8'
          onClick={clearBinding}
        >
          <X className='h-4 w-4' />
          <span className='sr-only'>Clear dynamic data</span>
        </Button>
      ) : null}
      <Button
        type='button'
        size='icon'
        variant={isOpen ? 'secondary' : 'ghost'}
        className='size-8 shrink-0'
        onClick={() => setOpen((value) => !value)}
      >
        <Cable className='h-4 w-4' />
        <span className='sr-only'>Edit dynamic data</span>
      </Button>
    </div>
  )

  const editor = list ? (
    <ListBindingEditor
      contentTypes={sourceContentTypes}
      field={field as EncodedListField}
      binding={listBinding}
      onChange={updateListBinding}
    />
  ) : (
    <FieldBindingEditor
      contentTypes={sourceContentTypes}
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
    <Dialog open={isOpen} onOpenChange={(value) => setOpen(value)}>
      <DialogContent className='max-h-[85vh] w-screen max-w-5xl! overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Dynamic data</DialogTitle>
          <DialogDescription className='sr-only'>
            Configure dynamic data for {fieldName}
          </DialogDescription>
        </DialogHeader>
        {editor}
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
