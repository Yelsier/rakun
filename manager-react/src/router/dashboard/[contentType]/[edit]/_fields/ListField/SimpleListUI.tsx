'use client'

import { CheckIcon, Plus, Trash } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EncodedSimpleListField } from '@rakun-kit/core'
import type { EncodedRelationField } from '@rakun-kit/core'
import type { TranslatableValue } from '@rakun-kit/core/types'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { fieldsMap, type FieldRef } from '../../ContentTypeEdit'
import { FieldValue, useFieldValues } from '../shared'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'
import { useTRPC } from '@/components/trpc-provider'
import { useEditErrorStore } from '@/hooks/app-store'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'

type SimpleListProps = EncodedSimpleListField & {
  id: string
  defaultData?: FieldValue
  ref?: React.Ref<FieldRef>
}

type SimpleListItem = {
  uid: string
  value: FieldValue
}

type ExistingRelationValue = {
  type: 'existing'
  _id: string
  contentType: string
}

const isExistingRelation = (value: unknown): value is ExistingRelationValue =>
  !!value &&
  typeof value === 'object' &&
  'type' in value &&
  value.type === 'existing' &&
  '_id' in value &&
  typeof value._id === 'string' &&
  'contentType' in value &&
  typeof value.contentType === 'string'

const isTranslatable = (
  value: unknown,
): value is TranslatableValue<unknown> =>
  !!value &&
  typeof value === 'object' &&
  '_tag' in value &&
  value._tag === 'Translatable'

const mapRelationsToIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter(isExistingRelation).map((item) => item._id)
}

const mapDefaultDataToIds = (
  value: unknown,
  isTranslatableField: boolean,
): unknown => {
  if (isTranslatableField && isTranslatable(value)) {
    const mapped = Object.fromEntries(
      Object.entries(value).map(([lang, langValue]) =>
        lang === '_tag' ? [lang, 'Translatable'] : [lang, mapRelationsToIds(langValue)],
      ),
    )
    return mapped as TranslatableValue<string[]>
  }
  return mapRelationsToIds(value)
}

const mapPrimitiveValuesToStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item
      if (typeof item === 'number') return String(item)
      return null
    })
    .filter((item): item is string => item !== null)
}

const mapPrimitiveDefaultDataToStrings = (
  value: unknown,
  isTranslatableField: boolean,
): unknown => {
  if (isTranslatableField && isTranslatable(value)) {
    const mapped = Object.fromEntries(
      Object.entries(value).map(([lang, langValue]) =>
        lang === '_tag'
          ? [lang, 'Translatable']
          : [lang, mapPrimitiveValuesToStrings(langValue)],
      ),
    )
    return mapped as TranslatableValue<string[]>
  }
  return mapPrimitiveValuesToStrings(value)
}

const RelationSimpleListUI: React.FC<SimpleListProps> = ({ id, ref, ...props }) => {
  const relationField = props.field as EncodedRelationField
  const trpc = useTRPC()
  const { getTranslation } = useLanguage()
  const { removeRelatedErrors } = useEditErrorStore()
  const labelField = relationField.contentType.listFields?.[0] || '_id'

  const defaultIds = useMemo(
    () => mapDefaultDataToIds(props.defaultData, props.isTranslatable),
    [props.defaultData, props.isTranslatable],
  )

  const { value, getValue, getState, errors, onValueChange, cleanErrors } =
    useFieldValues<string[]>({
      id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: defaultIds as never,
      defaultValue: [],
      validateValue: (nextValue) => {
        if (props.isRequired && nextValue.length === 0) {
          return 'This field is required'
        }
        return null
      },
    })

  const { data } = useQuery(
    trpc.manager.list.queryOptions({
      contentType: relationField.contentType.name,
      query: {
        options: {
          limit: 'all',
          fields: [labelField],
        },
      },
    }),
  )

  const queryData = data as
    | { items?: Array<Record<string, unknown> & { _id: string }> }
    | undefined
  const options = useMemo(() => {
    const items = (queryData?.items ?? []) as Array<Record<string, unknown> & { _id: string }>
    return items.map((item) => ({
      value: item._id,
      label: String(getTranslation(item[labelField]) || item._id),
    }))
  }, [queryData?.items, getTranslation, labelField])

  const labelsById = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )

  const mapIdsToExistingRelations = (ids: string[]) =>
    ids.map(
      (_id): ExistingRelationValue => ({
        type: 'existing',
        _id,
        contentType: relationField.contentType.name,
      }),
    )

  const getRelationValue = () => {
    const idsValue = getValue()
    if (idsValue && typeof idsValue === 'object' && '_error' in idsValue) {
      return idsValue
    }

    if (props.isTranslatable && idsValue && typeof idsValue === 'object') {
      const mapped = Object.fromEntries(
        Object.entries(idsValue).map(([lang, langValue]) =>
          lang === '_tag'
            ? [lang, 'Translatable']
            : [lang, Array.isArray(langValue) ? mapIdsToExistingRelations(langValue) : null],
        ),
      )
      return mapped
    }

    return Array.isArray(idsValue) ? mapIdsToExistingRelations(idsValue) : null
  }

  const getRelationState = () => {
    const idsState = getState()
    if (props.isTranslatable && idsState && typeof idsState === 'object') {
      return Object.fromEntries(
        Object.entries(idsState).map(([lang, langValue]) =>
          lang === '_tag'
            ? [lang, 'Translatable']
            : [lang, Array.isArray(langValue) ? mapIdsToExistingRelations(langValue) : null],
        ),
      )
    }
    return Array.isArray(idsState) ? mapIdsToExistingRelations(idsState) : idsState
  }

  const handleRemove = (removeId: string) => {
    if (!value.includes(removeId)) return
    onValueChange(value.filter((id) => id !== removeId))
    cleanErrors()
    removeRelatedErrors(id)
  }

  const handleToggle = (toggleId: string) => {
    if (value.includes(toggleId)) {
      handleRemove(toggleId)
      return
    }
    onValueChange([...value, toggleId])
    cleanErrors()
    removeRelatedErrors(id)
  }

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getRelationValue}
      getState={getRelationState}
      ref={ref}
    >
      <Tags>
        <TagsTrigger>
          {value.map((selectedId) => (
            <TagsValue key={selectedId} onRemove={() => handleRemove(selectedId)}>
              {labelsById.get(selectedId) || selectedId}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput placeholder={`Search ${relationField.contentType.name}...`} />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {options.map((option) => (
                <TagsItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleToggle}
                >
                  {option.label}
                  {value.includes(option.value) ? (
                    <CheckIcon className='text-muted-foreground' size={14} />
                  ) : null}
                </TagsItem>
              ))}
            </TagsGroup>
          </TagsList>
        </TagsContent>
      </Tags>
    </FieldWrapper>
  )
}

const PrimitiveSimpleListUI: React.FC<SimpleListProps> = ({ id, ref, ...props }) => {
  const { removeRelatedErrors } = useEditErrorStore()
  const [query, setQuery] = useState('')
  const isNumberField = props.field.config.type === 'Number'

  const defaultValues = useMemo(
    () => mapPrimitiveDefaultDataToStrings(props.defaultData, props.isTranslatable),
    [props.defaultData, props.isTranslatable],
  )

  const { value, getValue, getState, errors, onValueChange, cleanErrors } =
    useFieldValues<string[]>({
      id,
      isRequired: props.isRequired,
      isTranslatable: props.isTranslatable,
      defaultData: defaultValues as never,
      defaultValue: [],
      validateValue: (nextValue) => {
        if (props.isRequired && nextValue.length === 0) {
          return 'This field is required'
        }
        return null
      },
    })

  const normalizeToken = (
    raw: string,
    options?: { silent?: boolean },
  ): string | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null

    if (!isNumberField) return trimmed

    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) {
      if (!options?.silent) {
        toast.error('Invalid number')
      }
      return null
    }
    return String(parsed)
  }

  const toOutput = (values: string[]): Array<string | number> => {
    if (!isNumberField) return values
    return values
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item))
  }

  const getPrimitiveValue = () => {
    const rawValue = getValue()
    if (rawValue && typeof rawValue === 'object' && '_error' in rawValue) {
      return rawValue
    }

    if (props.isTranslatable && rawValue && typeof rawValue === 'object') {
      return Object.fromEntries(
        Object.entries(rawValue).map(([lang, langValue]) =>
          lang === '_tag'
            ? [lang, 'Translatable']
            : [lang, Array.isArray(langValue) ? toOutput(langValue) : null],
        ),
      )
    }

    return Array.isArray(rawValue) ? toOutput(rawValue) : null
  }

  const getPrimitiveState = () => {
    const rawState = getState()
    if (props.isTranslatable && rawState && typeof rawState === 'object') {
      return Object.fromEntries(
        Object.entries(rawState).map(([lang, langValue]) =>
          lang === '_tag'
            ? [lang, 'Translatable']
            : [lang, Array.isArray(langValue) ? toOutput(langValue) : null],
        ),
      )
    }

    return Array.isArray(rawState) ? toOutput(rawState) : rawState
  }

  const handleRemove = (removeValue: string) => {
    if (!value.includes(removeValue)) return
    onValueChange(value.filter((item) => item !== removeValue))
    cleanErrors()
    removeRelatedErrors(id)
  }

  const handleAdd = (raw: string) => {
    const token = normalizeToken(raw)
    if (!token) return
    if (value.includes(token)) {
      setQuery('')
      return
    }
    onValueChange([...value, token])
    cleanErrors()
    removeRelatedErrors(id)
    setQuery('')
  }

  const filteredExisting = value.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  )
  const normalizedQuery = normalizeToken(query, { silent: true })
  const canCreate = !!normalizedQuery && !value.includes(normalizedQuery)

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getPrimitiveValue}
      getState={getPrimitiveState}
      ref={ref}
    >
      <Tags value={query} setValue={setQuery}>
        <TagsTrigger>
          {value.map((item) => (
            <TagsValue key={item} onRemove={() => handleRemove(item)}>
              {item}
            </TagsValue>
          ))}
        </TagsTrigger>
        <TagsContent>
          <TagsInput
            placeholder={`Add ${isNumberField ? 'number' : 'value'}...`}
            value={query}
            onValueChange={setQuery}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              handleAdd(query)
            }}
          />
          <TagsList>
            <TagsEmpty />
            <TagsGroup>
              {canCreate ? (
                <TagsItem
                  value={query}
                  onSelect={() => handleAdd(query)}
                >
                  Create "{query.trim()}"
                </TagsItem>
              ) : null}
              {filteredExisting.map((item) => (
                <TagsItem key={item} value={item} onSelect={() => handleRemove(item)}>
                  {item}
                  <CheckIcon className='text-muted-foreground' size={14} />
                </TagsItem>
              ))}
            </TagsGroup>
          </TagsList>
        </TagsContent>
      </Tags>
    </FieldWrapper>
  )
}

const GenericSimpleListUI: React.FC<SimpleListProps> = ({ id, ref, ...props }) => {
  const refs = useRef<Record<string, FieldRef | null>>({})
  const valueRef = useRef<SimpleListItem[]>([])
  const { language } = useLanguage()

  const { value, errors, onValueChange, getValue, getState } = useFieldValues<
    SimpleListItem[]
  >({
    id,
    isRequired: props.isRequired,
    isTranslatable: props.isTranslatable,
    defaultData: Array.isArray(props.defaultData)
      ? props.defaultData.map((item) => ({
          uid: crypto.randomUUID(),
          value: item as FieldValue,
        }))
      : undefined,
    defaultValue: [],
    validateValue: (value) => {
      const values = value.map((item) => refs.current[item.uid]?.getValue())
      if (values.some((v) => typeof v === 'object' && v && '_error' in v)) {
        return 'Please fix the errors above'
      }
      return null
    },
  })

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const getValueWithNested = () => {
    const values = getValue()
    if (!values || (typeof values === 'object' && '_error' in values)) {
      return values
    }

    return (values as SimpleListItem[])
      .map((item) => refs.current[item.uid]?.getValue())
      .filter((v) => v !== undefined && v !== null && v !== '')
  }

  const getStateWithNested = () => {
    const states = getState()
    if (!states) return states
    return (states as SimpleListItem[]).map((item) => ({
      uid: item.uid,
      value: refs.current[item.uid]?.getState(),
    }))
  }

  const handleDelete = useCallback(
    (uid: string) => {
      onValueChange(
        value
          .filter((item) => item.uid !== uid)
          .map((item) => ({
            uid: item.uid,
            value: refs.current[item.uid]?.getState() as FieldValue,
          })),
      )
      delete refs.current[uid]
    },
    [onValueChange, value],
  )

  const handleAddItem = useCallback(() => {
    const currentValue = valueRef.current
    onValueChange([
      ...(currentValue?.map((item) => ({
        uid: item.uid,
        value: refs.current[item.uid]?.getState() as FieldValue,
      })) || []),
      {
        uid: crypto.randomUUID(),
        value: undefined as unknown as FieldValue,
      },
    ])
  }, [onValueChange])

  useEffect(() => {
    const currentValue = valueRef.current
    onValueChange(
      currentValue?.map((item) => ({
        uid: item.uid,
        value: refs.current[item.uid]?.getState() as FieldValue,
      })),
    )
    // Keep in sync only when changing language, matching ListUI behavior.
  }, [language.code])

  const FieldComponent = fieldsMap[props.field.config.type]
  const relationName =
    props.field.config.ui === 'ContentType'
      ? (props.field as EncodedRelationField).contentType.name
      : 'Item'

  return (
    <FieldWrapper
      id={id}
      errors={errors}
      getValue={getValueWithNested}
      getState={getStateWithNested}
      ref={ref}
    >
      <Button onClick={handleAddItem} variant={'outline'} type='button'>
        <Plus /> Add {relationName}
      </Button>

      {value.length > 0 ? (
        <div className='mt-6 flex flex-col gap-4'>
          {value.map((item, index) => (
            <Card key={item.uid}>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>
                  {relationName} {index + 1}
                </CardTitle>
                <Button
                  size={'icon'}
                  variant={'destructive'}
                  onClick={() => handleDelete(item.uid)}
                  type='button'
                >
                  <Trash />
                </Button>
              </CardHeader>
              <CardContent>
                <FieldComponent
                  id={`${id}.${item.uid}`}
                  ref={(fieldRef) => {
                    refs.current[item.uid] = fieldRef
                  }}
                  defaultData={value[index]?.value}
                  {...props.field}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </FieldWrapper>
  )
}

const SimpleListUI: React.FC<SimpleListProps> = (props) => {
  const isExistingRelationList =
    props.field.config.ui === 'ContentType' &&
    (props.field as EncodedRelationField).only === 'existing'
  const isPrimitiveList =
    props.field.config.type === 'String' || props.field.config.type === 'Number'

  if (isExistingRelationList) {
    return <RelationSimpleListUI {...props} />
  }

  if (isPrimitiveList) {
    return <PrimitiveSimpleListUI {...props} />
  }

  return <GenericSimpleListUI {...props} />
}

export default SimpleListUI
