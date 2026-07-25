'use client'

import { Box, ChevronsUpDown, Eye, GripVertical, Unlink, Plus, Save, Trash } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  EncodedRelationField,
  IteratorItemVisibilityCondition,
  ListFieldValueItem,
  RelationFieldValue,
} from '@rakun-kit/core/client'
import { isIteratorItemVisible } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import type { ListPropsRef } from '.'
import { fieldsMap, type FieldRef } from '../../ContentTypeEdit'
import { type FieldValue, useFieldValues } from '../shared'
import { useConditionFieldState } from '../shared/condition-state'
import { FieldWrapper } from '../shared/FieldWrapper'

import { useManagerClient, useManagerMutation } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'
import { getIteratorModuleDisplay, IteratorModulePickerDialog } from './IteratorModulePicker'
import { IteratorVisibilityDialog } from './IteratorVisibilityDialog'
import { useSession } from '@/state/session'
import { getEncodedContentPermissions } from '@/state/permissions'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type ListFieldValues = (ListFieldValueItem<FieldValue> & { uid: string })[]

type RelationExistingValue = Extract<RelationFieldValue, { type: 'existing' }>
type RelationNewValue = Extract<RelationFieldValue, { type: 'new' }>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object')

const hasNestedError = (value: unknown): boolean => {
  if (!isRecord(value)) return false
  if ('_error' in value) return true
  if (Array.isArray(value)) return value.some(hasNestedError)
  return Object.values(value).some(hasNestedError)
}

const isRelationValue = (value: unknown): value is RelationFieldValue =>
  isRecord(value) && 'type' in value && (value.type === 'new' || value.type === 'existing')

const isRelationNewValue = (value: unknown): value is RelationNewValue =>
  isRelationValue(value) && value.type === 'new'

const isRelationExistingValue = (value: unknown): value is RelationExistingValue =>
  isRelationValue(value) && value.type === 'existing'

const getRelationField = (
  field: ListPropsRef['fields'][number]['field']
): EncodedRelationField | undefined =>
  field.config.type === 'Relation' ? (field as EncodedRelationField) : undefined

const getCreatedId = (result: unknown) =>
  isRecord(result) && typeof result._id === 'string' ? result._id : undefined

const documentMetadataKeys = new Set([
  '_id',
  '_revision',
  '_schemaVersion',
  '_trashed',
  '_visibility',
  '_visibilityBeforeTrash',
  'createdAt',
  'createdBy',
  'trashedAt',
  'trashedBy',
  'updatedAt',
  'updatedBy',
])

const copyDocumentAsNewModuleData = (document: Record<string, unknown>, contentType: string) => ({
  ...Object.fromEntries(Object.entries(document).filter(([key]) => !documentMetadataKeys.has(key))),
  _type: contentType,
})

const isManagerListQueryForContentType = (queryKey: readonly unknown[], contentType: string) => {
  const [prefix, name, input] = queryKey

  return (
    prefix === 'rakun-manager' &&
    name === 'manager.list' &&
    isRecord(input) &&
    input.contentType === contentType
  )
}

const getCreatePermissions = (contentType: EncodedRelationField['contentType']) =>
  getEncodedContentPermissions(contentType, ['own'])

const canSaveAsGlobalModule = (contentType: EncodedRelationField['contentType']) =>
  Boolean(contentType.menu?.title || contentType.modulePicker)

const canUsePermissions = (
  permissions: ReturnType<typeof getEncodedContentPermissions>,
  hasAnyPermission: (permissions: ReturnType<typeof getEncodedContentPermissions>) => boolean
) => permissions.length === 0 || hasAnyPermission(permissions)

type ManagerListData = {
  totalItems?: number
  items?: Array<Record<string, unknown> & { _id: string }>
}

const appendCreatedModuleToListData =
  (created: Record<string, unknown> & { _id: string }) => (data: ManagerListData | undefined) => {
    if (!data?.items || data.items.some((item) => item._id === created._id)) {
      return data
    }

    return {
      ...data,
      totalItems: typeof data.totalItems === 'number' ? data.totalItems + 1 : data.totalItems,
      items: [created, ...data.items],
    }
  }

const getModuleId = (item: ListFieldValues[number]) => {
  const value = item.value

  if (!isRecord(value)) return undefined

  const record = value as Record<string, unknown>

  if (typeof record._id === 'string') {
    return record._id
  }

  if (isRecord(record.data) && typeof record.data._id === 'string') {
    return record.data._id
  }

  return undefined
}

const isApiOnlyNewRelationField = (
  field: ListPropsRef['fields'][number]['field']
): field is EncodedRelationField => {
  const relationField = getRelationField(field)

  return Boolean(
    relationField &&
    relationField.only === 'new' &&
    Object.values(relationField.contentType.fields).every((field) => field.visibility === 'api')
  )
}

const getApiOnlyNewRelationValue = (field: EncodedRelationField): RelationNewValue => ({
  type: 'new',
  data: {
    _type: field.contentType.name,
  },
})

const AddListButtons = React.memo(
  ({ fields, onAdd }: { fields: ListPropsRef['fields']; onAdd: (fieldName: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {fields.map((field) => (
        <Button onClick={() => onAdd(field.name)} variant="outline" key={field.name}>
          <Plus /> {field.name}
        </Button>
      ))}
    </div>
  )
)

AddListButtons.displayName = 'AddListButtons'

const ListUI: React.FC<ListPropsRef> = ({ id, ref, ...props }) => {
  const refs = useRef<Record<string, FieldRef | null>>({})
  const valueRef = useRef<ListFieldValues>([])
  const [addedModuleUid, setAddedModuleUid] = useState<string | null>(null)
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [unlinkingUid, setUnlinkingUid] = useState<string | null>(null)
  const [visibilityUid, setVisibilityUid] = useState<string | null>(null)
  const setRef = useCallback(
    (uid: string) => (fieldRef: FieldRef | null) => {
      refs.current[uid] = fieldRef
    },
    []
  )
  const { language } = useLanguage()
  const conditionFieldState = useConditionFieldState()
  const { hasAnyPermission } = useSession()
  const queryClient = useQueryClient()
  const managerClient = useManagerClient()
  const { mutateAsync: createModule } = useManagerMutation('manager.create')

  const { value, errors, onValueChange, getValue, getState } = useFieldValues<ListFieldValues>({
    id,
    isRequired: props.isRequired,
    isTranslatable: props.isTranslatable,
    defaultData: (
      props.defaultData as (ListFieldValueItem<FieldValue> & {
        uid?: string
      })[]
    )?.map((item) => ({
      ...item,
      uid: item.uid || crypto.randomUUID(),
    })),
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

  useEffect(() => {
    if (!addedModuleUid) return

    let nextFrame = 0
    const frame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => {
        const navigationId = `${id}.${addedModuleUid}`
        const target = Array.from(
          document.querySelectorAll<HTMLElement>('[data-rakun-manager-module-navigation-id]')
        ).find((element) => element.dataset.rakunManagerModuleNavigationId === navigationId)

        if (!target) return

        const scrollArea = document.querySelector<HTMLElement>(
          '[data-rakun-manager-edit-scroll-area]'
        )
        const viewport = scrollArea?.querySelector<HTMLElement>(
          '[data-slot="scroll-area-viewport"]'
        )

        if (viewport?.contains(target)) {
          const viewportRect = viewport.getBoundingClientRect()
          const targetRect = target.getBoundingClientRect()
          const top =
            viewport.scrollTop +
            targetRect.top -
            viewportRect.top -
            (viewport.clientHeight - targetRect.height) / 2

          viewport.scrollTo({ top, behavior: 'smooth' })
        }

        target.focus({ preventScroll: true })
        target.classList.remove('rakun-manager-preview-selected')
        void target.offsetWidth
        target.classList.add('rakun-manager-preview-selected')
        setAddedModuleUid(null)

        window.setTimeout(() => {
          target.classList.remove('rakun-manager-preview-selected')
        }, 2200)
      })
    })

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(nextFrame)
    }
  }, [addedModuleUid, id])

  const getItemFallbackValue = useCallback(
    (item: ListFieldValues[number]) => {
      const fieldConfig = props.fields.find((config) => config.name === item.name)

      if (fieldConfig && isApiOnlyNewRelationField(fieldConfig.field)) {
        return getApiOnlyNewRelationValue(fieldConfig.field) as FieldValue
      }

      return item.value
    },
    [props.fields]
  )

  const getItemStateValue = useCallback(
    (item: ListFieldValues[number]) => {
      const stateValue = refs.current[item.uid]?.getState()

      return stateValue === undefined ? getItemFallbackValue(item) : (stateValue as FieldValue)
    },
    [getItemFallbackValue]
  )

  const getCurrentListState = useCallback(
    () =>
      valueRef.current.map((item) => ({
        name: item.name,
        value: getItemStateValue(item),
        uid: item.uid,
        visibleWhen: item.visibleWhen,
      })),
    [getItemStateValue]
  )

  const getValueWithNested = () => {
    const values = getValue()

    if (!values || '_error' in values) {
      return values
    }

    return (values as ListFieldValues)
      .map((field) => {
        const nestedValue = refs.current[field.uid]?.getValue()

        return {
          name: field.name,
          value:
            nestedValue === undefined ? getItemFallbackValue(field) : (nestedValue as FieldValue),
          visibleWhen: field.visibleWhen,
        }
      })
      .filter((v) => v.value !== undefined && v.value !== null && v.value !== '')
  }

  const getStateWithNested = () => {
    const states = getState()

    if (!states) return states

    return (states as ListFieldValues).map((field) => ({
      name: field.name,
      value: getItemStateValue(field),
      uid: field.uid,
      visibleWhen: field.visibleWhen,
    }))
  }

  const handleSort = useCallback(
    (items: ListFieldValues) => {
      onValueChange(
        items.map((item) => ({
          name: item.name,
          value: getItemStateValue(item),
          uid: item.uid,
          visibleWhen: item.visibleWhen,
        }))
      )
    },
    [getItemStateValue, onValueChange]
  )

  const handleDelete = useCallback(
    (uid: string) => {
      onValueChange(
        value
          .filter((item) => item.uid !== uid)
          .map((item) => ({
            name: item.name,
            value: getItemStateValue(item),
            uid: item.uid,
            visibleWhen: item.visibleWhen,
          }))
      )
      delete refs.current[uid]
    },
    [getItemStateValue, onValueChange, value]
  )

  const handleAddItem = useCallback(
    (fieldName: string, initialValue?: FieldValue) => {
      const uid = crypto.randomUUID()

      setAddedModuleUid(uid)
      onValueChange([
        ...getCurrentListState(),
        {
          name: fieldName,
          value: initialValue as FieldValue,
          uid,
        },
      ])
    },
    [getCurrentListState, onValueChange]
  )

  const handleSaveModule = useCallback(
    async (item: ListFieldValues[number], title: string) => {
      const fieldConfig = props.fields.find((field) => field.name === item.name)
      const relationField = fieldConfig ? getRelationField(fieldConfig.field) : undefined

      if (!relationField) {
        toast.error('Only relation modules can be saved')
        return
      }

      if (!canSaveAsGlobalModule(relationField.contentType)) {
        toast.error('This module cannot be saved globally')
        return
      }

      const createPermissions = getCreatePermissions(relationField.contentType)

      if (!canUsePermissions(createPermissions, hasAnyPermission)) {
        toast.error('You do not have permission to save this module globally')
        return
      }

      const currentValue =
        (refs.current[item.uid]?.getValue() as FieldValue | undefined) ?? getItemFallbackValue(item)

      if (hasNestedError(currentValue)) {
        toast.error('Please fix this module before saving it')
        return
      }

      if (isRelationExistingValue(currentValue)) {
        toast.info('This module is already saved')
        return
      }

      if (!isRelationNewValue(currentValue) || !isRecord(currentValue.data)) {
        toast.error('This module cannot be saved yet')
        return
      }

      setSavingUid(item.uid)

      try {
        const created = await createModule({
          contentType: relationField.contentType.name,
          data: currentValue.data,
        })
        const createdId = getCreatedId(created)

        if (!createdId) {
          toast.error('The module was created but no id was returned')
          return
        }

        const createdRecord = created as Record<string, unknown> & {
          _id: string
        }
        const existingValue: RelationExistingValue = {
          type: 'existing',
          _id: createdId,
          contentType: relationField.contentType.name,
        }

        onValueChange(
          getCurrentListState().map((currentItem) =>
            currentItem.uid === item.uid
              ? {
                  name: currentItem.name,
                  value: existingValue as FieldValue,
                  uid: currentItem.uid,
                  visibleWhen: currentItem.visibleWhen,
                }
              : currentItem
          )
        )

        queryClient.setQueriesData<ManagerListData>(
          {
            predicate: (query) =>
              isManagerListQueryForContentType(query.queryKey, relationField.contentType.name),
          },
          appendCreatedModuleToListData(createdRecord)
        )

        await queryClient.invalidateQueries({
          predicate: (query) =>
            isManagerListQueryForContentType(query.queryKey, relationField.contentType.name),
        })

        toast.success(`${title} saved`)
      } catch (error) {
        toast.error(getActionErrorMessage(error, 'Could not save module'))
      } finally {
        setSavingUid(null)
      }
    },
    [
      createModule,
      getCurrentListState,
      getItemFallbackValue,
      hasAnyPermission,
      onValueChange,
      props.fields,
      queryClient,
    ]
  )

  const handleUnlinkModule = useCallback(
    async (item: ListFieldValues[number], title: string) => {
      const fieldConfig = props.fields.find((field) => field.name === item.name)
      const relationField = fieldConfig ? getRelationField(fieldConfig.field) : undefined

      if (!relationField) {
        toast.error('Only relation modules can be unlinked')
        return
      }

      const currentValue =
        (refs.current[item.uid]?.getValue() as FieldValue | undefined) ?? getItemFallbackValue(item)

      if (!isRelationExistingValue(currentValue)) {
        toast.info('This module is already local')
        return
      }

      setUnlinkingUid(item.uid)

      try {
        const document = await managerClient.request('manager.get', {
          contentType: relationField.contentType.name,
          id: currentValue._id,
        })
        const data = isRecord(document)
          ? copyDocumentAsNewModuleData(document, relationField.contentType.name)
          : { _type: relationField.contentType.name }
        const newValue: RelationNewValue = {
          type: 'new',
          data,
        }

        delete refs.current[item.uid]

        onValueChange(
          getCurrentListState().map((currentItem) =>
            currentItem.uid === item.uid
              ? {
                  name: currentItem.name,
                  value: newValue as FieldValue,
                  uid: currentItem.uid,
                  visibleWhen: currentItem.visibleWhen,
                }
              : currentItem
          )
        )

        toast.success(`${title} unlinked`)
      } catch (error) {
        toast.error(getActionErrorMessage(error, 'Could not unlink module'))
      } finally {
        setUnlinkingUid(null)
      }
    },
    [getCurrentListState, getItemFallbackValue, managerClient, onValueChange, props.fields]
  )

  const handleVisibilityChange = useCallback(
    (uid: string, condition?: IteratorItemVisibilityCondition) => {
      onValueChange(
        getCurrentListState().map((item) =>
          item.uid === uid
            ? {
                ...item,
                visibleWhen: condition,
              }
            : item
        )
      )
    },
    [getCurrentListState, onValueChange]
  )

  useEffect(() => {
    onValueChange(
      valueRef.current.map((item) => ({
        name: item.name,
        value: getItemStateValue(item),
        uid: item.uid,
        visibleWhen: item.visibleWhen,
      }))
    )
  }, [language.code])

  const visibilityItem = visibilityUid
    ? value.find((item) => item.uid === visibilityUid)
    : undefined
  const visibilityField = visibilityItem
    ? props.fields.find((field) => field.name === visibilityItem.name)
    : undefined
  const visibilityModuleTitle = visibilityField
    ? (getIteratorModuleDisplay(visibilityField)?.title ?? visibilityItem?.name)
    : visibilityItem?.name

  return (
    <Sortable value={value} onValueChange={handleSort} getItemValue={(item) => item.uid}>
      <FieldWrapper
        id={id}
        errors={errors}
        getValue={getValueWithNested}
        getState={getStateWithNested}
        ref={ref}
      >
        {props.config.ui === 'Iterator' ? (
          <IteratorModulePickerDialog fields={props.fields} onAdd={handleAddItem} />
        ) : (
          <AddListButtons fields={props.fields} onAdd={handleAddItem} />
        )}
        {value.length > 0 && (
          <SortableContent className="max-h-full">
            <div className="flex flex-col gap-4">
              {value.map((item, i) => {
                const fieldConfig = props.fields.find((f) => f.name === item.name)
                if (!fieldConfig) {
                  return null
                }

                const noModulesToRender = isApiOnlyNewRelationField(fieldConfig.field)

                const FieldComponent = fieldsMap[fieldConfig.field.config.type]
                const relationField = getRelationField(fieldConfig.field)
                const relationValue = isRelationValue(item.value) ? item.value : undefined
                const isSavedModule = isRelationExistingValue(relationValue)
                const createPermissions = relationField
                  ? getCreatePermissions(relationField.contentType)
                  : []
                const canSaveGlobal = relationField
                  ? canSaveAsGlobalModule(relationField.contentType) &&
                    canUsePermissions(createPermissions, hasAnyPermission)
                  : false
                const moduleId = getModuleId(item)
                const moduleDisplay =
                  props.config.ui === 'Iterator' ? getIteratorModuleDisplay(fieldConfig) : undefined
                const ModuleIcon = moduleDisplay?.icon ?? Box
                const moduleTitle = moduleDisplay?.title ?? item.name
                const fieldKey = `${item.uid}:${relationValue?.type ?? 'empty'}`
                const isVisibleForCurrentDocument = isIteratorItemVisible(
                  item,
                  conditionFieldState?.fieldState ?? {}
                )

                return (
                  <SortableItem key={item.uid} value={item.uid} asChild>
                    <div
                      tabIndex={-1}
                      className="flex gap-2"
                      data-rakun-manager-field-id={id}
                      data-rakun-manager-module-id={moduleId}
                      data-rakun-manager-module-index={i}
                      data-rakun-manager-module-item=""
                      data-rakun-manager-module-navigation-id={`${id}.${item.uid}`}
                      data-rakun-manager-module-title={moduleTitle}
                    >
                      <Collapsible defaultOpen={!noModulesToRender} className="w-full">
                        <Card
                          className={cn(
                            'w-full',
                            item.visibleWhen &&
                              !isVisibleForCurrentDocument &&
                              'border-dashed opacity-70'
                          )}
                        >
                          <CardHeader className="gap-0">
                            <CollapsibleTrigger asChild disabled={noModulesToRender}>
                              <div
                                className="flex cursor-pointer items-center justify-between gap-2"
                                data-rakun-manager-module-trigger=""
                              >
                                <CardTitle className="flex min-w-0 items-center gap-2">
                                  <div className="flex shrink-0 items-center gap-2">
                                    <SortableItemHandle asChild>
                                      <Button variant="ghost" size="icon" className="size-8">
                                        <GripVertical className="h-4 w-4" />
                                      </Button>
                                    </SortableItemHandle>
                                    {!noModulesToRender ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        asChild
                                      >
                                        <div>
                                          <ChevronsUpDown />
                                          <span className="sr-only">Toggle</span>
                                        </div>
                                      </Button>
                                    ) : null}
                                  </div>
                                  {moduleDisplay ? (
                                    <div className="flex min-w-0 items-center gap-2">
                                      <ModuleIcon className="size-4 shrink-0 text-muted-foreground" />
                                      <span className="truncate">{moduleTitle}</span>
                                      {isSavedModule ? (
                                        <Badge variant="secondary" className="shrink-0">
                                          Global
                                        </Badge>
                                      ) : null}
                                      {item.visibleWhen ? (
                                        <Badge variant="outline" className="shrink-0">
                                          {isVisibleForCurrentDocument
                                            ? 'Conditional'
                                            : `Hidden for this ${
                                                props.parentContentType?.name ?? 'document'
                                              }`}
                                        </Badge>
                                      ) : null}
                                    </div>
                                  ) : (
                                    item.name
                                  )}
                                </CardTitle>
                                <div className="flex shrink-0 items-center gap-2">
                                  {props.config.ui === 'Iterator' ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          aria-label={`Change ${moduleTitle} visibility`}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            setVisibilityUid(item.uid)
                                          }}
                                        >
                                          <Eye />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Module visibility</TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                  {props.config.ui === 'Iterator' &&
                                  !isSavedModule &&
                                  canSaveGlobal ? (
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      aria-label={`Save ${moduleTitle}`}
                                      disabled={savingUid === item.uid}
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        void handleSaveModule(item, moduleTitle)
                                      }}
                                    >
                                      <Save />
                                    </Button>
                                  ) : null}
                                  {props.config.ui === 'Iterator' && isSavedModule ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="outline"
                                          aria-label={`Unlink ${moduleTitle}`}
                                          disabled={unlinkingUid === item.uid}
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            void handleUnlinkModule(item, moduleTitle)
                                          }}
                                        >
                                          <Unlink />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        Unlink global module
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDelete(item.uid)
                                    }}
                                  >
                                    <Trash />
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                          </CardHeader>
                          {!noModulesToRender ? (
                            <CollapsibleContent forceMount className="data-[state=closed]:hidden">
                              <CardContent>
                                <FieldComponent
                                  key={fieldKey}
                                  id={`${id}.${item.uid}.${fieldConfig.name}`}
                                  ref={setRef(item.uid)}
                                  collapsible
                                  defaultData={value[i]?.value}
                                  parentContentType={props.parentContentType}
                                  {...fieldConfig.field}
                                />
                              </CardContent>
                            </CollapsibleContent>
                          ) : null}
                        </Card>
                      </Collapsible>
                    </div>
                  </SortableItem>
                )
              })}
            </div>
          </SortableContent>
        )}
        <IteratorVisibilityDialog
          open={visibilityItem !== undefined}
          condition={visibilityItem?.visibleWhen}
          contentType={props.parentContentType}
          moduleTitle={visibilityModuleTitle ?? 'Module'}
          onOpenChange={(open) => {
            if (!open) setVisibilityUid(null)
          }}
          onSave={(condition) => {
            if (visibilityItem) {
              handleVisibilityChange(visibilityItem.uid, condition)
            }
          }}
        />
      </FieldWrapper>
    </Sortable>
  )
}

export default ListUI
