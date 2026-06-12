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
import { Cable, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { Textarea } from '@/components/ui/textarea'
import { useManagerQuery } from '@/client/react'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type FieldBinding = DynamicBindingSource | undefined

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

const sourceFieldOptions = (contentType?: EncodedContentType) => {
  if (!contentType) return []

  const fields = Object.entries(contentType.fields)
    .filter(([, field]) => field.visibility === 'all')
    .map(([name]) => ({
      label: name,
      value: name,
    }))

  return contentType.routes?.some((route) => route.hasPage)
    ? [{ label: 'href', value: '$href' }, ...fields]
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

const FieldBindingEditor = ({
  contentTypes,
  binding,
  onChange,
}: {
  contentTypes: EncodedContentType[]
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
    <div className='grid gap-3'>
      <Label className='grid gap-1'>
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
          <SelectTrigger>
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
      <Label className='grid gap-1'>
        Item
        <Select
          value={sourceId}
          onValueChange={(value) => {
            setSourceId(value)
            emit(sourceType, value, fieldPath)
          }}
        >
          <SelectTrigger>
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
      <Label className='grid gap-1'>
        Field
        <Select
          value={fieldPath}
          onValueChange={(value) => {
            setFieldPath(value)
            emit(sourceType, sourceId, value)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder='Field' />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sourceFieldOptions(selectedContentType).map((field) => (
                <SelectItem key={field.value} value={field.value}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Label>
    </div>
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
  const [filter, setFilter] = useState(
    binding?.query?.filter ? JSON.stringify(binding.query.filter) : '',
  )
  const [filterError, setFilterError] = useState<string | null>(null)
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

  return (
    <div className='grid gap-3'>
      <Label className='grid gap-1'>
        Source
        <Select
          value={sourceType}
          onValueChange={(value) => {
            setSourceType(value)
            emit({ contentType: value, map: {} })
          }}
        >
          <SelectTrigger>
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
      <Label className='grid gap-1'>
        Item
        <Select
          value={itemName}
          onValueChange={(value) => {
            setItemName(value)
            emit({ itemName: value, map: {} })
          }}
        >
          <SelectTrigger>
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
      <div className='grid grid-cols-2 gap-2'>
        <Label className='grid gap-1'>
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
        <Label className='grid gap-1'>
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
            <SelectTrigger>
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
      </div>
      <Label className='grid gap-1'>
        Filter
        <Textarea
          value={filter}
          onChange={(event) => {
            const value = event.target.value
            setFilter(value)
            if (!value.trim()) {
              setFilterError(null)
              emit({ query: { ...binding?.query, filter: undefined } })
              return
            }

            try {
              const parsed = JSON.parse(value) as Record<string, unknown>
              setFilterError(null)
              emit({ query: { ...binding?.query, filter: parsed } })
            } catch {
              setFilterError('Invalid JSON')
            }
          }}
        />
        {filterError ? (
          <span className='text-xs text-destructive'>{filterError}</span>
        ) : null}
      </Label>
      {targetFields.map(([targetField]) => {
        const source = binding?.map?.[targetField]

        return (
          <Label key={targetField} className='grid gap-1'>
            {targetField}
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
              <SelectTrigger>
                <SelectValue placeholder='Source field' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sourceFieldOptions(selectedSource).map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Label>
        )
      })}
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
}: {
  contentType: EncodedContentType
  fieldName: string
  field: EncodedFieldUnknown
  contentTypes: EncodedContentType[]
  bindings: DynamicDocumentBindings | undefined
  onChange: (bindings: DynamicDocumentBindings | undefined) => void
}) => {
  if (!isDynamicFieldEnabled(contentType, fieldName, field)) return null

  const list = isListField(field)
  const sourceContentTypes = getSourceContentTypes(contentType, contentTypes)
  const fieldBinding = bindings?.fields?.[fieldName]
  const listBinding = bindings?.lists?.[fieldName]
  const bound = list ? !!listBinding : !!fieldBinding
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          size='icon'
          variant={bound ? 'secondary' : 'ghost'}
          className='size-8'
        >
          <Cable className='h-4 w-4' />
          <span className='sr-only'>Dynamic data</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80' align='end'>
        <div className='grid gap-4'>
          <div className='flex items-center justify-between gap-2'>
            <span className='font-medium'>Dynamic data</span>
            {bound ? (
              <Button
                type='button'
                size='icon'
                variant='ghost'
                className='size-8'
                onClick={() =>
                  list
                    ? updateListBinding(undefined)
                    : updateFieldBinding(undefined)
                }
              >
                <X className='h-4 w-4' />
              </Button>
            ) : null}
          </div>
          {list ? (
            <ListBindingEditor
              contentTypes={sourceContentTypes}
              field={field as EncodedListField}
              binding={listBinding}
              onChange={updateListBinding}
            />
          ) : (
            <FieldBindingEditor
              contentTypes={sourceContentTypes}
              binding={fieldBinding}
              onChange={updateFieldBinding}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
