'use client'

import { cva } from 'class-variance-authority'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { EncodedContentType } from '@rakun-kit/core/client'
import { Seo } from '@rakun-kit/core/internal-content-types'
import {
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  LayoutPanelTop,
  Languages,
  NotepadText,
  RotateCcw,
  ScrollText,
  Trash,
} from 'lucide-react'
import { EncodedField } from '@rakun-kit/core/client'
import { useQueries, useQueryClient } from '@tanstack/react-query'

import type { FieldRef } from './ContentTypeEdit'
import ContentTypeEdit from './ContentTypeEdit'
import VersionHistory from './versions'
import { FieldValue } from './_fields/shared'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createManagerQueryOptions,
  createManagerQueryKey,
  useManagerClient,
  useManagerMutation,
  useManagerQuery,
} from '@/client/react'
import { useManagerNavigation } from '@/state/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/state/language'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useSession } from '@/state/session'
import { useEditErrorStore } from '@/hooks/app-store'

type RouteLayoutModuleRecord = {
  _id: string
  routeId: string
  routeKey: string
  routeContentType: string
  key: string
  contentType: string
  order: number
  moduleId?: string
}

type RouteLayoutModuleOverrideRecord = {
  _id: string
  routeId: string
  routeKey: string
  contentTypeId: string
  key: string
  contentType: string
  moduleId?: string
}

type ManagerContentTypeRecord = {
  name: string
  listFields?: string[]
}

type LayoutModuleOption = {
  value: string
  label: string
}

type DocumentVisibility = 'draft' | 'hidden' | 'published' | 'trash'
type EditableDocumentVisibility = Exclude<DocumentVisibility, 'trash'>

const visibilitySelectStyles: Record<EditableDocumentVisibility, string> = {
  draft: 'border-blue-500/70 text-blue-700 hover:bg-blue-500/10 dark:text-blue-300',
  hidden: 'border-purple-500/70 text-purple-700 hover:bg-purple-500/10 dark:text-purple-300',
  published: 'border-primary/70 text-primary hover:bg-primary/10',
}

const visibilityIcons = {
  draft: EyeOff,
  hidden: Eye,
  published: Eye,
} satisfies Record<EditableDocumentVisibility, typeof Eye>

const getLayoutOverrideValue = (override?: RouteLayoutModuleOverrideRecord) => {
  if (!override) return '__default__'
  return override.moduleId && override.moduleId.length > 0 ? override.moduleId : '__none__'
}

const RouteLayoutModuleTabContent = ({
  layoutModule,
  override,
  options,
  activeTab,
  contentTypeId,
  overridesByKey,
  routeLayoutOverridesQuery,
}: {
  layoutModule: RouteLayoutModuleRecord
  override?: RouteLayoutModuleOverrideRecord
  options: LayoutModuleOption[]
  activeTab: string
  contentTypeId?: string
  overridesByKey: Map<string, RouteLayoutModuleOverrideRecord>
  routeLayoutOverridesQuery: ReturnType<typeof useManagerQuery<'manager.list'>>
}) => {
  const [selected, setSelected] = useState(() => getLayoutOverrideValue(override))

  useEffect(() => {
    setSelected(getLayoutOverrideValue(override))
  }, [override])

  const createOverrideMutation = useManagerMutation('manager.create')
  const updateOverrideMutation = useManagerMutation('manager.update')
  const deleteOverrideMutation = useManagerMutation('manager.delete')

  const [isSaving, setIsSaving] = useState(false)

  const saveLayoutOverride = async (layoutModule: RouteLayoutModuleRecord, selected: string) => {
    if (!contentTypeId) return

    setIsSaving(true)

    const existing = overridesByKey.get(`${layoutModule.routeId}:${layoutModule.key}`)

    if (selected === '__default__') {
      if (existing) {
        await deleteOverrideMutation.mutateAsync({
          contentType: 'RouteLayoutModuleOverride',
          id: existing._id,
        })
        await routeLayoutOverridesQuery.refetch()
      }

      toast.success('Layout override updated successfully')
      setIsSaving(false)
      return
    }

    const payload = {
      _type: 'RouteLayoutModuleOverride' as const,
      routeId: layoutModule.routeId,
      routeKey: layoutModule.routeKey,
      contentTypeId,
      key: layoutModule.key,
      contentType: layoutModule.contentType,
      moduleId: selected === '__none__' ? '' : selected,
    }

    if (existing) {
      await updateOverrideMutation.mutateAsync({
        contentType: 'RouteLayoutModuleOverride',
        id: existing._id,
        data: payload,
      })
    } else {
      await createOverrideMutation.mutateAsync({
        contentType: 'RouteLayoutModuleOverride',
        data: payload,
      })
    }

    toast.success('Layout override updated successfully')
    await routeLayoutOverridesQuery.refetch()
    setIsSaving(false)
  }

  const defaultOption = layoutModule.moduleId
    ? (options.find((option) => option.value === layoutModule.moduleId)?.label ??
      layoutModule.moduleId)
    : 'No module'

  return (
    <TabsContent
      value={`layout:${layoutModule._id}`}
      forceMount
      hidden={activeTab !== `layout:${layoutModule._id}`}
      className="w-full"
    >
      <div className="mx-auto flex w-full flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{layoutModule.contentType}</h2>
          <p className="text-muted-foreground text-sm">
            Default from route: {defaultOption}. Override only for this entry.
          </p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Select module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Use route default</SelectItem>
            <SelectItem value="__none__">No module</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          className="w-fit"
          loading={isSaving}
          onClick={() => saveLayoutOverride(layoutModule, selected)}
        >
          Save override
        </Button>
      </div>
    </TabsContent>
  )
}

export const errorStyle = cva('', {
  variants: {
    error: {
      true: 'border-red-500',
    },
  },
})

const EditPage: React.FC<{
  contentType: EncodedContentType
  defaultData?: Record<string, FieldValue>
  onAfterRestore?: () => Promise<unknown> | unknown
}> = ({ contentType, defaultData, onAfterRestore }) => {
  const iterablesRef = useRef<FieldRef>(null)
  const nonIterablesRef = useRef<FieldRef>(null)
  const seoRef = useRef<FieldRef>(null)
  const navigation = useManagerNavigation()
  const draft = useRef(defaultData)
  const queryClient = useQueryClient()
  const managerClient = useManagerClient()
  const createMutation = useManagerMutation('manager.create')
  const updateMutation = useManagerMutation('manager.update')
  const deleteMutation = useManagerMutation('manager.delete')
  const trashMutation = useManagerMutation('manager.trash')
  const translateDocumentMutation = useManagerMutation('manager.translateDocument')
  const { getTranslation, language, languageList } = useLanguage()
  const { hasPermissions } = useSession()
  const editErrors = useEditErrorStore((state) => state.errors)
  const contentTypeId = (defaultData as { _id?: string } | undefined)?._id
  const hasVisibility = Boolean(contentType.documentVisibility)
  const canReadVersions = hasPermissions(['manager.versions.readAny'])
  const canRestoreVersions = hasPermissions(['manager.versions.updateAny'])
  const hasVersioning = Boolean(contentType.versioning) && canReadVersions
  const isTrashed =
    (defaultData as { _trashed?: boolean } | undefined)?._trashed === true ||
    (defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility === 'trash'
  const [visibility, setVisibility] = useState<DocumentVisibility>(
    ((defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility ??
      'draft') as DocumentVisibility
  )
  const [formRevision, setFormRevision] = useState(0)
  const visibilityBeforeTrash = ((
    defaultData as { _visibilityBeforeTrash?: EditableDocumentVisibility } | undefined
  )?._visibilityBeforeTrash ?? 'published') as EditableDocumentVisibility
  const editableVisibility = visibility === 'trash' ? visibilityBeforeTrash : visibility
  const VisibilityIcon = visibilityIcons[editableVisibility]

  useEffect(() => {
    draft.current = defaultData
    setFormRevision((revision) => revision + 1)
    setVisibility(
      ((defaultData as { _visibility?: DocumentVisibility } | undefined)?._visibility ??
        'draft') as DocumentVisibility
    )
  }, [defaultData])
  const routeLayoutModulesQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RouteLayoutModule',
      query: {
        filter: { routeContentType: contentType.name },
        options: {
          limit: 'all',
          fields: [
            'routeId',
            'routeKey',
            'routeContentType',
            'key',
            'contentType',
            'order',
            'moduleId',
          ],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  })
  const routeLayoutOverridesQuery = useManagerQuery({
    name: 'manager.list',
    input: {
      contentType: 'RouteLayoutModuleOverride',
      query: {
        filter: { contentTypeId: contentTypeId ?? '' },
        options: {
          limit: 'all',
          fields: ['routeId', 'routeKey', 'contentTypeId', 'key', 'contentType', 'moduleId'],
        },
      },
    },
    enabled: Boolean(contentTypeId),
  })
  const contentTypesQuery = useManagerQuery({
    name: 'manager.contentTypes',
    input: undefined as never,
    enabled: Boolean(contentTypeId),
  })

  const invalidateContentListQueries = async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [prefix, name, input] = query.queryKey as [
          string?,
          string?,
          { contentType?: string }?,
        ]

        return (
          prefix === 'rakun-manager' &&
          name === 'manager.list' &&
          input?.contentType === contentType.name
        )
      },
    })
  }

  const handleCreate = async (data: unknown) => {
    const result = await createMutation.mutateAsync({
      contentType: contentType.name,
      data,
    })

    if (result && typeof result === 'object' && '_id' in result) {
      navigation.push?.({
        name: 'content.edit',
        contentType: contentType.name,
        id: String(result._id),
      })
    }

    await invalidateContentListQueries()
    toast.success('Created successfully')
  }

  const handleUpdate = async (data: unknown) => {
    const result = await updateMutation.mutateAsync({
      contentType: contentType.name,
      id: (defaultData as { _id: string })?._id,
      data,
    })

    if (result && typeof result === 'object' && '_id' in result) {
      navigation.push?.({
        name: 'content.edit',
        contentType: contentType.name,
        id: String(result._id),
      })
    }

    if (hasVersioning && contentTypeId) {
      await queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.versions.list', {
          contentType: contentType.name,
          documentId: contentTypeId,
        }),
      })
    }

    await invalidateContentListQueries()
    toast.success('Updated successfully')
  }

  const handleRestoreFromTrash = async () => {
    if (!contentTypeId) return

    const restoredVisibility = visibilityBeforeTrash

    await updateMutation.mutateAsync({
      contentType: contentType.name,
      id: contentTypeId,
      data: {
        _trashed: false,
        _visibility: restoredVisibility,
      },
    })
    setVisibility(restoredVisibility)
    await invalidateContentListQueries()
    await onAfterRestore?.()
    toast.success('Restored from trash')
  }

  const handleMoveToTrash = async () => {
    if (!contentTypeId) return

    await trashMutation.mutateAsync({
      contentType: contentType.name,
      id: contentTypeId,
    })
    setMoveToTrashOpen(false)
    await invalidateContentListQueries()
    await onAfterRestore?.()
    toast.success('Moved to trash')
  }

  const handlePermanentDelete = async () => {
    if (!contentTypeId) return

    await deleteMutation.mutateAsync({
      contentType: contentType.name,
      id: contentTypeId,
    })
    setPermanentDeleteOpen(false)
    await invalidateContentListQueries()
    navigation.push?.({
      name: 'content.list',
      contentType: contentType.name,
    })
    toast.success('Deleted permanently')
  }

  const readFormData = () => {
    saveState()
    const iterablesValue = iterablesRef.current?.getValue() as
      | ({ _error?: string } & object)
      | undefined
    const nonIterablesValue = nonIterablesRef.current?.getValue() as
      | ({ _error?: string } & object)
      | undefined
    const seoValue = seoRef.current?.getValue() as ({ _error?: string } & object) | undefined

    if (iterablesValue?._error || nonIterablesValue?._error || seoValue?._error) {
      setShowSaveErrorTooltip(true)
      return
    }

    setShowSaveErrorTooltip(false)

    const data = {
      ...(iterablesValue || {}),
      ...(nonIterablesValue || {}),
      ...(seoValue || {}),
      ...(hasVisibility ? { _visibility: visibility } : {}),
    }

    return data
  }

  const handleSave = async () => {
    const data = readFormData()

    if (!data) return

    if (defaultData) {
      await handleUpdate(data)
    } else {
      await handleCreate(data)
    }
  }

  const handleTranslateDocument = async ({
    from,
    to,
    overwrite,
  }: {
    from: string
    to: string[]
    overwrite: boolean
  }) => {
    if (!contentTypeId) return
    if (to.length === 0) {
      toast.error('Select at least one target language')
      return
    }

    const data = readFormData()

    if (!data) return

    const result = await translateDocumentMutation.mutateAsync({
      contentType: contentType.name,
      id: contentTypeId,
      from,
      to,
      overwrite,
      data,
    })

    draft.current = result.item as Record<string, FieldValue>
    setFormRevision((revision) => revision + 1)
    await invalidateContentListQueries()

    if (hasVersioning && contentTypeId) {
      await queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.versions.list', {
          contentType: contentType.name,
          documentId: contentTypeId,
        }),
      })
    }

    await onAfterRestore?.()
    toast.success('Translated successfully')
  }

  const saveState = () => {
    draft.current = {
      ...(iterablesRef.current?.getState() as object),
      ...(nonIterablesRef.current?.getState() as object),
      ...(seoRef.current?.getState() as object),
    }
  }

  const { iterables, hasIterables, nonIterables, hasNonIterables, seo, hasSeo } = useMemo(() => {
    const iterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    }
    const nonIterables = {
      ...contentType,
      fields: {} as Record<string, EncodedField>,
    }
    const seo = { ...contentType, fields: {} as Record<string, EncodedField> }

    for (const [fieldName, fieldValue] of Object.entries(contentType.fields)) {
      if (fieldValue.config.ui === 'Iterator') {
        iterables.fields[fieldName] = fieldValue
      } else if (
        'contentType' in fieldValue &&
        (fieldValue.contentType as EncodedContentType).name === Seo.name
      ) {
        seo.fields[fieldName] = fieldValue
      } else {
        nonIterables.fields[fieldName] = fieldValue
      }
    }

    return {
      iterables,
      hasIterables: Object.keys(iterables.fields).length > 0,
      nonIterables,
      hasNonIterables: Object.keys(nonIterables.fields).length > 0,
      seo,
      hasSeo: Object.keys(seo.fields).length > 0,
    }
  }, [contentType])

  const routeLayoutModules = (routeLayoutModulesQuery.data?.items ??
    []) as RouteLayoutModuleRecord[]
  const routeLayoutOverrides = (routeLayoutOverridesQuery.data?.items ??
    []) as RouteLayoutModuleOverrideRecord[]
  const overridesByKey = new Map(
    routeLayoutOverrides.map((override) => [`${override.routeId}:${override.key}`, override])
  )
  const contentTypes = (contentTypesQuery.data ?? []) as ManagerContentTypeRecord[]
  const contentTypeByName = new Map(
    contentTypes.map((contentType) => [contentType.name, contentType])
  )
  const layoutContentTypes = Array.from(new Set(routeLayoutModules.map((item) => item.contentType)))
  const layoutModuleOptionQueries = useQueries({
    queries: layoutContentTypes.map((contentType) => {
      const labelField = contentTypeByName.get(contentType)?.listFields?.[0] ?? '_id'

      return createManagerQueryOptions(managerClient, 'manager.list', {
        contentType,
        query: {
          options: {
            limit: 'all',
            fields: labelField === '_id' ? ['_id'] : [labelField],
          },
        },
      })
    }),
  })
  const layoutOptionsByContentType = new Map(
    layoutContentTypes.map((contentType, index) => {
      const labelField = contentTypeByName.get(contentType)?.listFields?.[0] ?? '_id'
      const data = layoutModuleOptionQueries[index]?.data as
        | { items?: Array<Record<string, unknown> & { _id: string }> }
        | undefined

      return [
        contentType,
        (data?.items ?? []).map((item) => ({
          value: item._id,
          label: String(getTranslation(item[labelField]) || item._id),
        })),
      ] as const
    })
  )
  const [activeTab, setActiveTab] = useState<
    'content' | 'info' | 'seo' | 'versions' | `layout:${string}`
  >(hasNonIterables ? 'info' : hasIterables ? 'content' : hasSeo ? 'seo' : 'versions')
  const [showSaveErrorTooltip, setShowSaveErrorTooltip] = useState(false)
  const [translationOpen, setTranslationOpen] = useState(false)
  const [translationSource, setTranslationSource] = useState(language.code)
  const [translationTargets, setTranslationTargets] = useState<string[]>(() =>
    languageList.filter((item) => item.code !== language.code).map((item) => item.code)
  )
  const [translationOverwrite, setTranslationOverwrite] = useState(false)
  const [moveToTrashOpen, setMoveToTrashOpen] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)
  const translationTargetOptions = languageList.filter((item) => item.code !== translationSource)
  const tabErrors = useMemo(() => {
    const hasErrorsInFields = (fields: Record<string, EncodedField>) =>
      Object.keys(fields).some((fieldName) => {
        const rootId = `${contentType.name}.${fieldName}`
        return editErrors.some((error) => error.id === rootId || error.id.startsWith(`${rootId}.`))
      })

    return {
      info: hasErrorsInFields(nonIterables.fields),
      content: hasErrorsInFields(iterables.fields),
      seo: hasErrorsInFields(seo.fields),
    }
  }, [contentType.name, editErrors, iterables.fields, nonIterables.fields, seo.fields])
  const tabErrorClassName =
    '!text-destructive data-[state=active]:!text-destructive after:bg-destructive'
  const TabErrorText = () => (
    <span className="ml-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-destructive">
      Error
    </span>
  )

  useEffect(() => {
    if (editErrors.length === 0) {
      setShowSaveErrorTooltip(false)
    }
  }, [editErrors.length])

  useEffect(() => {
    const codes = new Set(languageList.map((item) => item.code))

    if (!codes.has(translationSource)) {
      setTranslationSource(language.code)
    }

    setTranslationTargets((targets) =>
      targets.filter((target) => codes.has(target) && target !== translationSource)
    )
  }, [language.code, languageList, translationSource])

  return (
    <>
      <div className="container py-10 px-4 mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            saveState()
            setActiveTab(v as 'content' | 'info' | 'seo' | 'versions' | `layout:${string}`)
          }}
          className="w-full"
        >
          <div className="flex gap-2 justify-between items-center sticky top-0 bg-background z-50 pb-3 mb-3 border-b">
            <div className="flex">
              <TabsList variant={'line'} data-tour="content-edit-tabs">
                {hasNonIterables ? (
                  <TabsTrigger value="info" className={cn(tabErrors.info && tabErrorClassName)}>
                    <NotepadText />
                    Info
                    {tabErrors.info ? <TabErrorText /> : null}
                  </TabsTrigger>
                ) : null}
                {hasIterables ? (
                  <TabsTrigger
                    value="content"
                    className={cn(tabErrors.content && tabErrorClassName)}
                  >
                    <ScrollText />
                    Content
                    {tabErrors.content ? <TabErrorText /> : null}
                  </TabsTrigger>
                ) : null}
                {hasSeo ? (
                  <TabsTrigger value="seo" className={cn(tabErrors.seo && tabErrorClassName)}>
                    <Globe />
                    Seo
                    {tabErrors.seo ? <TabErrorText /> : null}
                  </TabsTrigger>
                ) : null}
                {[...routeLayoutModules]
                  .sort((a, b) => a.order - b.order)
                  .map((layoutModule) => (
                    <TabsTrigger key={layoutModule._id} value={`layout:${layoutModule._id}`}>
                      <LayoutPanelTop />
                      {layoutModule.contentType}
                    </TabsTrigger>
                  ))}
                {hasVersioning && contentTypeId ? (
                  <TabsTrigger value="versions">
                    <GitBranch />
                    Versions
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              {hasVisibility && isTrashed ? (
                <>
                  <Button
                    variant="outline"
                    loading={updateMutation.isPending}
                    onClick={() => void handleRestoreFromTrash()}
                  >
                    <RotateCcw />
                    Restore from trash
                  </Button>
                  <Button
                    variant="destructive"
                    loading={deleteMutation.isPending}
                    onClick={() => setPermanentDeleteOpen(true)}
                  >
                    <Trash />
                    Delete permanently
                  </Button>
                </>
              ) : hasVisibility ? (
                <div data-tour="content-edit-visibility">
                  <Select
                    value={editableVisibility}
                    onValueChange={(value) => setVisibility(value as DocumentVisibility)}
                  >
                    <SelectTrigger
                      className={cn('w-36', visibilitySelectStyles[editableVisibility])}
                    >
                      <VisibilityIcon className="text-current" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {contentTypeId && !isTrashed ? (
                <Button
                  variant="destructive"
                  loading={trashMutation.isPending}
                  onClick={() => setMoveToTrashOpen(true)}
                >
                  <Trash />
                  Move to trash
                </Button>
              ) : null}
              {contentTypeId && !isTrashed && languageList.length > 1 ? (
                <Dialog open={translationOpen} onOpenChange={setTranslationOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTranslationSource(language.code)
                        setTranslationTargets(
                          languageList
                            .filter((item) => item.code !== language.code)
                            .map((item) => item.code)
                        )
                      }}
                    >
                      <Languages />
                      Translate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Translate document</DialogTitle>
                      <DialogDescription>
                        Translate supported fields and save the document.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Source language</Label>
                        <Select
                          value={translationSource}
                          onValueChange={(value) => {
                            setTranslationSource(value)
                            setTranslationTargets((targets) =>
                              targets.filter((target) => target !== value)
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            {languageList.map((item) => (
                              <SelectItem key={item.code} value={item.code}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Target languages</Label>
                        <div className="grid max-h-56 gap-2 overflow-auto rounded-md border p-3">
                          {translationTargetOptions.map((item) => {
                            const checked = translationTargets.includes(item.code)

                            return (
                              <label
                                key={item.code}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(nextChecked) => {
                                    setTranslationTargets((targets) =>
                                      nextChecked
                                        ? Array.from(new Set([...targets, item.code]))
                                        : targets.filter((target) => target !== item.code)
                                    )
                                  }}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                                <Badge variant="outline">{item.code}</Badge>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2">
                        <Checkbox
                          checked={translationOverwrite}
                          onCheckedChange={(checked) => setTranslationOverwrite(Boolean(checked))}
                        />
                        <span className="text-sm">Overwrite existing translations</span>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTranslationOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        loading={translateDocumentMutation.isPending}
                        disabled={translationTargets.length === 0}
                        onClick={() => {
                          void (async () => {
                            await handleTranslateDocument({
                              from: translationSource,
                              to: translationTargets,
                              overwrite: translationOverwrite,
                            })
                            setTranslationOpen(false)
                          })()
                        }}
                      >
                        Translate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}

              <Tooltip open={showSaveErrorTooltip}>
                <TooltipTrigger asChild>
                  <Button
                    loading={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      deleteMutation.isPending ||
                      trashMutation.isPending
                    }
                    className="cursor-pointer ml-auto"
                    onClick={() => void handleSave()}
                    data-tour="content-edit-save"
                  >
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={8}>
                  Hay errores por corregir
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <Dialog open={moveToTrashOpen} onOpenChange={setMoveToTrashOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Move item to trash</DialogTitle>
                <DialogDescription>
                  This item will be hidden from lists and public routes. You can restore it from
                  the trash.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMoveToTrashOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  loading={trashMutation.isPending}
                  onClick={() => void handleMoveToTrash()}
                >
                  Move to trash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={permanentDeleteOpen} onOpenChange={setPermanentDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete item permanently</DialogTitle>
                <DialogDescription>
                  This item will be permanently deleted. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPermanentDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  loading={deleteMutation.isPending}
                  onClick={() => void handlePermanentDelete()}
                >
                  Delete permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {hasIterables ? (
            <TabsContent
              value="content"
              forceMount
              hidden={activeTab !== 'content'}
              className="w-full"
              data-tour="content-edit-fields"
            >
              <ContentTypeEdit
                key={`iterables:${formRevision}`}
                defaultData={draft.current}
                ref={iterablesRef}
                contentType={iterables}
                id={contentType.name}
                collapsible
                hideTitle
              />
            </TabsContent>
          ) : null}
          {hasNonIterables ? (
            <TabsContent
              value="info"
              forceMount
              hidden={activeTab !== 'info'}
              className="w-full"
              data-tour="content-edit-fields"
            >
              <ContentTypeEdit
                key={`info:${formRevision}`}
                defaultData={draft.current}
                ref={nonIterablesRef}
                contentType={nonIterables}
                id={contentType.name}
              />
            </TabsContent>
          ) : null}
          {hasSeo ? (
            <TabsContent
              value="seo"
              forceMount
              hidden={activeTab !== 'seo'}
              className="w-full"
              data-tour="content-edit-fields"
            >
              <ContentTypeEdit
                key={`seo:${formRevision}`}
                defaultData={draft.current}
                ref={seoRef}
                contentType={seo}
                id={contentType.name}
                hideTitle
              />
            </TabsContent>
          ) : null}
          {[...routeLayoutModules]
            .sort((a, b) => a.order - b.order)
            .map((layoutModule) => (
              <RouteLayoutModuleTabContent
                routeLayoutOverridesQuery={routeLayoutOverridesQuery}
                key={layoutModule._id}
                layoutModule={layoutModule}
                override={overridesByKey.get(`${layoutModule.routeId}:${layoutModule.key}`)}
                options={layoutOptionsByContentType.get(layoutModule.contentType) ?? []}
                activeTab={activeTab}
                contentTypeId={contentTypeId}
                overridesByKey={overridesByKey}
              />
            ))}
          {hasVersioning && contentTypeId ? (
            <TabsContent value="versions">
              <VersionHistory
                contentType={contentType.name}
                documentId={contentTypeId}
                canRestore={canRestoreVersions}
                onRestored={onAfterRestore}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </>
  )
}

export default EditPage
