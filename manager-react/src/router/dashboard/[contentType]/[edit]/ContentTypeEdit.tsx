'use client'

import { ChevronsUpDown, Languages } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DynamicDocumentBindings, EncodedContentType } from '@rakun-kit/core/client'
import { EncodedFieldUnknown, FieldType } from '@rakun-kit/core/client'
import { EncodedRelationField } from '@rakun-kit/core/client'

import BooleanField from './_fields/BooleanField'
import ContentReferenceField from './_fields/ContentReferenceField'
import DateField from './_fields/Date'
import FileField from './_fields/FileField'
import LinkField from './_fields/LinkField'
import ListField from './_fields/ListField'
import NumberField from './_fields/NumberField'
import RelationField from './_fields/RelationField'
import StringField from './_fields/StringField'
import SelectField from './_fields/Select'
import { FieldValue } from './_fields/shared'
import { evaluateFieldCondition } from './_fields/shared/condition'
import {
  ConditionFieldStateProvider,
  mergeConditionFieldState,
} from './_fields/shared/condition-state'
import { errorStyle } from './edit.styles'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { translateFieldLabel, useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'
import { useEditErrorStore } from '@/hooks/app-store'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { deepEqual } from '@/helpers/deepEqual'
import { useTRPC } from '@/components/trpc-provider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DynamicDataControl,
  isDynamicFallbackRequired,
  isDynamicFieldEnabled,
} from './_fields/DynamicDataControl'
import {
  useManagerPlugins,
  type ManagerFieldEditorRef,
} from '@/plugins'
import MissingUI from './_fields/Missing'

const REQUIRED_MARK = '*'

const defaultDataExtractor = (fieldName: string, defaultData?: Record<string, FieldValue>) => {
  if (!defaultData) {
    return undefined
  }

  return defaultData[fieldName]
}

type FieldComponentProps = EncodedFieldUnknown & {
  id: string
  defaultData?: FieldValue
  dynamicFallbackPlaceholder?: string
  ref: React.Ref<FieldRef>
  collapsible?: boolean
  parentContentType?: EncodedContentType
}

type FieldComponent = (config: FieldComponentProps) => React.ReactElement

const FieldMetaIcon = ({ label, children }: { label: string; children: ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        aria-label={label}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
      >
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={6}>
      {label}
    </TooltipContent>
  </Tooltip>
)

const FieldLabel = ({
  fieldName,
  isRequired,
  className,
}: {
  fieldName: string
  isRequired?: boolean
  className?: string
}) => {
  const t = useTranslations()
  const label = translateFieldLabel(t, fieldName)
  return (
    <span className={cn('flex min-w-0 items-center gap-1', className)}>
      <span className="truncate">{label}</span>
      {isRequired ? (
        <span
          aria-label={t('contentEdit.requiredField')}
          className="shrink-0 text-2xl font-bold leading-none text-destructive"
          title={t('contentEdit.requiredField')}
        >
          {REQUIRED_MARK}
        </span>
      ) : null}
    </span>
  )
}

const FieldTags = ({
  isTranslatable,
  children,
}: {
  isTranslatable?: boolean
  children?: ReactNode
}) => {
  const t = useTranslations()
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      {children}
      {isTranslatable ? (
        <FieldMetaIcon label={t('contentEdit.translatableField')}>
          <Languages aria-hidden="true" size={16} />
        </FieldMetaIcon>
      ) : null}
    </div>
  )
}

export const fieldsMap = {
  String: StringField,
  Relation: RelationField,
  Number: NumberField,
  Boolean: BooleanField,
  List: ListField,
  Link: LinkField,
  Date: DateField,
  Select: SelectField,
  File: FileField,
  ContentReference: ContentReferenceField,
} as {
  [key in FieldType]: FieldComponent
}

export function useArrayRefs<T>() {
  const refs = useRef<Array<T | null>>([])
  const setters = useRef<Array<((el: T | null) => void) | undefined>>([])

  const setRef = (index: number) => {
    const cached = setters.current[index]
    if (cached) return cached

    const setter = (el: T | null) => {
      refs.current[index] = el
    }
    setters.current[index] = setter
    return setter
  }

  return { refs, setRef }
}

export type FieldRef = ManagerFieldEditorRef

const hasNestedError = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') return false
  if ('_error' in value) return true
  if (Array.isArray(value)) return value.some(hasNestedError)
  return Object.values(value).some(hasNestedError)
}

const getFieldDescription = (fieldValue: EncodedFieldUnknown) =>
  typeof fieldValue.description === 'string' && fieldValue.description.trim().length > 0
    ? fieldValue.description
    : undefined

const getDefaultBindings = (
  defaultData?: Record<string, FieldValue>
): DynamicDocumentBindings | undefined =>
  defaultData && '_bindings' in defaultData
    ? (defaultData._bindings as DynamicDocumentBindings)
    : undefined

const cleanBindings = (
  bindings: DynamicDocumentBindings | undefined
): DynamicDocumentBindings | undefined => {
  if (!bindings) return undefined

  const fields =
    bindings.fields &&
    typeof bindings.fields === 'object' &&
    Object.keys(bindings.fields).length > 0
      ? bindings.fields
      : undefined
  const lists =
    bindings.lists && typeof bindings.lists === 'object' && Object.keys(bindings.lists).length > 0
      ? bindings.lists
      : undefined

  return fields || lists ? { fields, lists } : undefined
}

const ContentTypeEdit = forwardRef<
  FieldRef,
  {
    contentType: EncodedContentType
    id: string
    defaultData?: { [key: string]: FieldValue }
    parentContentType?: EncodedContentType
    collapsible?: boolean
    hideTitle?: boolean
  }
>((props, ref) => {
  const t = useTranslations()
  const { contentType, id, collapsible, hideTitle } = props
  const dynamicSourceContentType = props.parentContentType ?? contentType
  const trpc = useTRPC()
  const pluginRegistry = useManagerPlugins()
  const { data: contentTypesData } = useQuery(trpc.manager.contentTypes.queryOptions())

  const { refs, setRef } = useArrayRefs<FieldRef>()
  const errors = useEditErrorStore((state) => state.errors)
  const addError = useEditErrorStore((state) => state.addError)
  const removeRelatedErrors = useEditErrorStore(
    (state) => state.removeRelatedErrors
  )
  const formStateInitialValue = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(contentType.fields).map((fieldName) => [
          fieldName,
          defaultDataExtractor(fieldName, props.defaultData),
        ])
      ) as Record<string, unknown>,
    [contentType.fields, props.defaultData]
  )
  const [formState, setFormState] = useState(formStateInitialValue)
  const conditionFieldState = useMemo(
    () =>
      mergeConditionFieldState(
        props.defaultData as Record<string, unknown> | undefined,
        formState
      ),
    [formState, props.defaultData]
  )
  const [dynamicBindings, setDynamicBindings] = useState<DynamicDocumentBindings | undefined>(
    getDefaultBindings(props.defaultData)
  )
  const [dynamicEditorOpen, setDynamicEditorOpen] = useState<string | null>(null)
  const allItems = useMemo(
    () =>
      Object.entries(contentType.fields).filter(
        ([_, fieldValue]) => !(fieldValue.visibility === 'api')
      ),
    [contentType.fields]
  )
  const visibleItems = useMemo(
    () =>
      allItems.filter(([, fieldValue]) => evaluateFieldCondition(fieldValue.condition, formState)),
    [allItems, formState]
  )
  const visibleFieldNames = useMemo(
    () => new Set(visibleItems.map(([fieldName]) => fieldName)),
    [visibleItems]
  )
  const handleFieldStateChange = useCallback(
    (fieldId: string, state: unknown) => {
      const prefix = `${id}.`
      const fieldName = fieldId.startsWith(prefix) ? fieldId.slice(prefix.length) : fieldId

      if (fieldName.includes('.')) {
        return
      }

      setFormState((previous) => {
        if (deepEqual(previous[fieldName], state)) {
          return previous
        }

        return {
          ...previous,
          [fieldName]: state,
        }
      })
    },
    [id]
  )

  useImperativeHandle(
    ref,
    (): FieldRef => ({
      getValue: () => {
        const values = Object.fromEntries(
          allItems.map(([fieldName], i) => {
            if (!visibleFieldNames.has(fieldName)) {
              return [fieldName, null]
            }

            return [fieldName, refs.current[i]?.getValue()]
          })
        )

        if (Object.values(values).some(hasNestedError)) {
          const _error = t('contentEdit.formFixErrors')
          addError(id, _error)
          return { _error }
        }

        const bindings = cleanBindings(dynamicBindings)

        return {
          ...values,
          ...(bindings ? { _bindings: bindings } : {}),
          _type: contentType.name,
        }
      },
      getState: () => {
        const states = Object.fromEntries(
          allItems.map(([fieldName], i) => {
            if (!visibleFieldNames.has(fieldName)) {
              return [fieldName, formState[fieldName]]
            }

            return [fieldName, refs.current[i]?.getState()]
          })
        )
        const bindings = cleanBindings(dynamicBindings)
        return bindings ? { ...states, _bindings: bindings } : states
      },
    }),
    [addError, allItems, contentType.name, dynamicBindings, formState, id, visibleFieldNames]
  )

  return (
    <ConditionFieldStateProvider
      fieldState={conditionFieldState}
      onFieldStateChange={handleFieldStateChange}
    >
      <div className="flex flex-1 flex-col gap-8 mx-auto w-full h-full">
        {allItems.map(([fieldName, fieldValue], i) => {
          const isVisible = visibleFieldNames.has(fieldName)
          const description = getFieldDescription(fieldValue)

          if (!isVisible) {
            return null
          }

          const error = errors.find((e) => e.id === id + '.' + fieldName)?.error
          const showDynamicData = isDynamicFieldEnabled(contentType, fieldValue)
          const customEditor = fieldValue.config.editor
          const FieldComponent = customEditor
            ? pluginRegistry.fieldEditors[customEditor]
            : (fieldsMap[fieldValue.config.type] as FieldComponent | undefined)
          const dynamicBinding =
            fieldValue.config.ui === 'List' || fieldValue.config.ui === 'Iterator'
              ? dynamicBindings?.lists?.[fieldName]
              : dynamicBindings?.fields?.[fieldName]
          const dynamicFallbackPlaceholder =
            showDynamicData && dynamicBinding ? t('contentEdit.fallbackValue') : undefined
          const field = FieldComponent ? (
            <FieldComponent
              id={id + '.' + fieldName}
              ref={setRef(i)}
              {...fieldValue}
              isRequired={isDynamicFallbackRequired(fieldValue, dynamicBinding)}
              defaultData={defaultDataExtractor(fieldName, props.defaultData)}
              dynamicFallbackPlaceholder={dynamicFallbackPlaceholder}
              parentContentType={dynamicSourceContentType}
            />
          ) : (
            <MissingUI field={fieldValue.config} />
          )
          const dynamicOpen = dynamicEditorOpen === fieldName
          const setDynamicOpen = (open: boolean) => setDynamicEditorOpen(open ? fieldName : null)
          const dynamicTrigger = showDynamicData ? (
            <DynamicDataControl
              contentType={contentType}
              documentContentType={dynamicSourceContentType}
              fieldName={fieldName}
              field={fieldValue}
              contentTypes={(contentTypesData ?? []) as EncodedContentType[]}
              bindings={dynamicBindings}
              onChange={(bindings) => {
                setDynamicBindings(bindings)
                removeRelatedErrors(`${id}.${fieldName}`)
              }}
              open={dynamicOpen}
              onOpenChange={setDynamicOpen}
              mode="trigger"
            />
          ) : null
          const dynamicDialog = showDynamicData ? (
            <DynamicDataControl
              contentType={contentType}
              documentContentType={dynamicSourceContentType}
              fieldName={fieldName}
              field={fieldValue}
              contentTypes={(contentTypesData ?? []) as EncodedContentType[]}
              bindings={dynamicBindings}
              onChange={(bindings) => {
                setDynamicBindings(bindings)
                removeRelatedErrors(`${id}.${fieldName}`)
              }}
              open={dynamicOpen}
              onOpenChange={setDynamicOpen}
              mode="dialog"
            />
          ) : null

          const canCollapse =
            fieldValue.config.ui === 'ContentType' &&
            (fieldValue as EncodedRelationField).only === 'new' &&
            collapsible

          if (canCollapse) {
            return (
              <Collapsible defaultOpen key={fieldName}>
                <Card className={errorStyle({ error: !!error })}>
                  <CardHeader className="gap-0">
                    <div className="flex items-center justify-between gap-3">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="min-w-0 flex-1 cursor-pointer text-left">
                          <CardTitle className="flex min-w-0 items-center gap-2">
                            <Button variant="ghost" size="icon" className="size-8" asChild>
                              <span>
                                <ChevronsUpDown />
                                <span className="sr-only">{t('common.toggle')}</span>
                              </span>
                            </Button>
                            <FieldLabel
                              fieldName={fieldName}
                              isRequired={fieldValue.isRequired}
                            />
                          </CardTitle>
                        </button>
                      </CollapsibleTrigger>
                      <FieldTags isTranslatable={fieldValue.isTranslatable}>
                        {dynamicTrigger}
                      </FieldTags>
                    </div>
                    {dynamicDialog}
                  </CardHeader>
                  <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                    <CardContent>{field}</CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          }

          return (
            <div key={fieldName} className={`${canCollapse ? 'bg-red-600' : ''}`}>
              {hideTitle ? null : (
                <div className="mb-4 space-y-1">
                  <CardTitle className="flex items-center justify-between gap-3">
                    <FieldLabel fieldName={fieldName} isRequired={fieldValue.isRequired} />
                    <FieldTags isTranslatable={fieldValue.isTranslatable}>
                      {dynamicTrigger}
                    </FieldTags>
                  </CardTitle>
                  {description ? (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  ) : null}
                  {dynamicDialog}
                </div>
              )}
              {field}
            </div>
          )
        })}
      </div>
    </ConditionFieldStateProvider>
  )
})

export default ContentTypeEdit
