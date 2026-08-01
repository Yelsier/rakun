'use client'

import { useTranslations } from '@/i18n'

const REQUIRED_MARK = '*'

import type {
  EncodedListFieldItem,
  EncodedRelationField,
  RelationFieldValue,
} from '@rakun-kit/core/client'
import type { MaybeTranslatableValue } from '@rakun-kit/core/types'
import { useQueries } from '@tanstack/react-query'
import { Box, Pencil, Plus, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  createManagerQueryOptions,
  useManagerClient,
  useManagerMutation,
} from '@/client/react'
import { SearchInput } from '@/components/search-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { resolveLucideIcon } from '@/helpers/resolve-lucide-icon'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'
import { ManagerLink } from '@/link'
import { getEncodedContentPermissions } from '@/state/permissions'
import { useSession } from '@/state/session'

const ALL_CATEGORIES = '__all__'
const FALLBACK_CATEGORY = 'modules.otherCategory'

type IteratorModuleDisplay = {
  category: string
  contentType?: IteratorModuleContentType
  contentTypeName?: string
  description?: string
  fieldName: string
  icon?: LucideIcon
  keywords: string[]
  labelField: string
  preview?: string
  props: ModuleProp[]
  technicalName: string
  title: string
}

type ExistingRelationValue = Extract<RelationFieldValue, { type: 'existing' }>

type QueryableIteratorModuleDisplay = IteratorModuleDisplay & {
  contentType: IteratorModuleContentType
  contentTypeName: string
}

type ExistingIteratorModule = {
  canDelete: boolean
  canEdit: boolean
  category: string
  contentTypeName: string
  fieldName: string
  icon?: LucideIcon
  id: string
  keywords: string[]
  moduleTitle: string
  preview?: string
  title: string
  value: ExistingRelationValue
}

type ModuleProp = {
  label: string
  name: string
  required: boolean
}

type ModulePickerMetadata = {
  title?: string
  description?: string
  category?: string
  icon?: string
  preview?: string
  keywords?: string[]
}

type IteratorModuleContentType = EncodedRelationField['contentType'] & {
  modulePicker?: ModulePickerMetadata
}

const cleanText = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const getRelationField = (
  field: EncodedListFieldItem['field']
): EncodedRelationField | undefined =>
  field.config.type === 'Relation' ? (field as EncodedRelationField) : undefined

const uniqueText = (values: Array<string | undefined>) =>
  Array.from(new Set(values.filter(Boolean) as string[]))

const getModuleProps = (contentType: IteratorModuleContentType | undefined): ModuleProp[] =>
  Object.entries(contentType?.fields ?? {})
    .filter(([, field]) => field.visibility !== 'api')
    .map(([name, field]) => ({
      label: decodeCamelCase(name),
      name,
      required: field.isRequired,
    }))

export const getIteratorModuleDisplay = (entry: EncodedListFieldItem): IteratorModuleDisplay => {
  const relationField = getRelationField(entry.field)
  const contentType = relationField?.contentType as IteratorModuleContentType | undefined
  const modulePicker = contentType?.modulePicker
  const title =
    cleanText(modulePicker?.title) ??
    cleanText(contentType?.menu?.title) ??
    decodeCamelCase(entry.name)
  const category =
    cleanText(modulePicker?.category) ?? cleanText(contentType?.menu?.category) ?? FALLBACK_CATEGORY
  const description = cleanText(modulePicker?.description)
  const icon = resolveLucideIcon(modulePicker?.icon ?? contentType?.menu?.icon)
  const preview = cleanText(modulePicker?.preview)
  const props = getModuleProps(contentType)
  const labelField = contentType?.listFields?.[0] ?? '_id'
  const keywords = uniqueText([
    entry.name,
    contentType?.name,
    title,
    category,
    description,
    contentType?.menu?.title,
    contentType?.menu?.category,
    ...props.flatMap((prop) => [prop.name, prop.label]),
    ...(modulePicker?.keywords ?? []),
  ])

  return {
    category,
    contentType,
    contentTypeName: contentType?.name,
    description,
    fieldName: entry.name,
    icon,
    keywords,
    labelField,
    preview,
    props,
    technicalName: entry.name,
    title,
  }
}

const getSearchText = (option: { keywords: string[] }) =>
  option.keywords.join(' ').toLocaleLowerCase()

const sortModules = (a: IteratorModuleDisplay, b: IteratorModuleDisplay) =>
  a.category.localeCompare(b.category) ||
  a.title.localeCompare(b.title) ||
  a.technicalName.localeCompare(b.technicalName)

const ModuleIcon = ({ icon: Icon }: { icon?: LucideIcon }) => {
  const ResolvedIcon = Icon ?? Box

  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
      <ResolvedIcon className="size-5" />
    </div>
  )
}

const ModulePreviewImage = ({ src }: { src?: string }) => {
  const [failed, setFailed] = useState(false)

  return (
    <div className="flex aspect-video w-full items-center justify-center overflow-hidden border-b bg-muted">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={() => setFailed(true)}
        />
      ) : (
        <Box aria-hidden="true" className="size-10 text-muted-foreground/50" />
      )}
    </div>
  )
}

const isQueryableOption = (
  option: IteratorModuleDisplay
): option is QueryableIteratorModuleDisplay =>
  Boolean(option.contentType) &&
  typeof option.contentTypeName === 'string' &&
  option.contentTypeName.length > 0

const isGlobalModuleContentType = (contentType: IteratorModuleContentType) =>
  Boolean(contentType.menu?.title || contentType.modulePicker)

const getReadPermissions = (contentType: IteratorModuleContentType) =>
  getEncodedContentPermissions(contentType, ['own', 'readAny'])

const canPerformModuleAction = ({
  action,
  contentType,
  createdBy,
  currentUserId,
  hasAnyPermission,
}: {
  action: 'updateAny' | 'deleteAny'
  contentType: IteratorModuleContentType
  createdBy?: unknown
  currentUserId: string
  hasAnyPermission: ReturnType<typeof useSession>['hasAnyPermission']
}) => {
  const actionPermissions = getEncodedContentPermissions(contentType, [action])

  if (actionPermissions.length === 0 || hasAnyPermission(actionPermissions)) {
    return true
  }

  const ownPermissions = getEncodedContentPermissions(contentType, ['own'])

  return createdBy === currentUserId && hasAnyPermission(ownPermissions)
}

export const IteratorModulePickerDialog = ({
  fields,
  onAdd,
}: {
  fields: EncodedListFieldItem[]
  onAdd: (fieldName: string, value?: RelationFieldValue) => void
}) => {
  const t = useTranslations()
  const managerClient = useManagerClient()
  const { getTranslation } = useLanguage()
  const { hasAnyPermission, user } = useSession()
  const deleteModule = useManagerMutation('manager.delete')
  const preventCloseAutoFocus = useRef(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [deleteTarget, setDeleteTarget] =
    useState<ExistingIteratorModule | null>(null)
  const options = useMemo(
    () => fields.map(getIteratorModuleDisplay).sort(sortModules),
    [fields]
  )
  const queryableOptions = useMemo(() => options.filter(isQueryableOption), [options])
  const readableOptions = useMemo(
    () =>
      queryableOptions.filter((option) => {
        if (!isGlobalModuleContentType(option.contentType)) return false

        const readPermissions = getReadPermissions(option.contentType)

        return readPermissions.length === 0 || hasAnyPermission(readPermissions)
      }),
    [hasAnyPermission, queryableOptions]
  )
  const categories = useMemo(
    () =>
      Array.from(new Set(options.map((option) => option.category))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [options]
  )
  const existingModuleQueries = useQueries({
    queries: readableOptions.map((option) => {
      const fields =
        option.labelField === '_id'
          ? ['_id', 'createdBy']
          : ['_id', option.labelField, 'createdBy']

      return {
        ...createManagerQueryOptions(managerClient, 'manager.list', {
          contentType: option.contentTypeName,
          query: {
            options: {
              limit: 'all',
              fields,
            },
          },
        }),
        enabled: open,
        refetchOnMount: 'always' as const,
        retry: false,
      }
    }),
  })
  const existingModules = useMemo(
    () =>
      readableOptions.flatMap((option, index): ExistingIteratorModule[] => {
        const data = existingModuleQueries[index]?.data as
          | { items?: Array<Record<string, unknown> & { _id: string }> }
          | undefined

        return (data?.items ?? []).map((item) => {
          const translatedTitle = getTranslation(
            item[option.labelField] as MaybeTranslatableValue<string>
          )
          const title = String(translatedTitle || item._id)

          return {
            canDelete: canPerformModuleAction({
              action: 'deleteAny',
              contentType: option.contentType,
              createdBy: item.createdBy,
              currentUserId: user._id,
              hasAnyPermission,
            }),
            canEdit: canPerformModuleAction({
              action: 'updateAny',
              contentType: option.contentType,
              createdBy: item.createdBy,
              currentUserId: user._id,
              hasAnyPermission,
            }),
            category: option.category,
            contentTypeName: option.contentTypeName,
            fieldName: option.fieldName,
            icon: option.icon,
            id: item._id,
            keywords: uniqueText([
              title,
              item._id,
              option.title,
              option.category,
              option.description,
              ...option.keywords,
            ]),
            moduleTitle: option.title,
            preview: option.preview,
            title,
            value: {
              type: 'existing',
              _id: item._id,
              contentType: option.contentTypeName,
            },
          }
        })
      }),
    [existingModuleQueries, getTranslation, hasAnyPermission, readableOptions, user._id]
  )
  const searchTerm = search.trim().toLocaleLowerCase()
  const filteredOptions = useMemo(
    () =>
      options.filter((option) => {
        const matchesCategory =
          selectedCategory === ALL_CATEGORIES || option.category === selectedCategory
        const matchesSearch = searchTerm.length === 0 || getSearchText(option).includes(searchTerm)

        return matchesCategory && matchesSearch
      }),
    [options, searchTerm, selectedCategory]
  )
  const filteredExistingModules = useMemo(
    () =>
      existingModules.filter((module) => {
        const matchesCategory =
          selectedCategory === ALL_CATEGORIES || module.category === selectedCategory
        const matchesSearch = searchTerm.length === 0 || getSearchText(module).includes(searchTerm)

        return matchesCategory && matchesSearch
      }),
    [existingModules, searchTerm, selectedCategory]
  )
  const isLoadingExistingModules = existingModuleQueries.some(
    (query) => query.isPending || query.isFetching
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      void Promise.all(existingModuleQueries.map((query) => query.refetch()))
    }

    if (!nextOpen) {
      setSearch('')
      setSelectedCategory(ALL_CATEGORIES)
    }
  }

  const handleAdd = (fieldName: string, value?: RelationFieldValue) => {
    preventCloseAutoFocus.current = true
    onAdd(fieldName, value)
    handleOpenChange(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteModule.mutateAsync({
        contentType: deleteTarget.contentTypeName,
        id: deleteTarget.id,
      })
      await Promise.allSettled(existingModuleQueries.map((query) => query.refetch()))
      toast.success(t('modules.deleted', { title: deleteTarget.title }))
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('modules.couldNotDelete')))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <div className="flex w-full pb-4 lg:hidden">
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="m-0"
              data-rakun-manager-add-module-trigger
            >
              <Plus />
              {t('modules.addModule')}
            </Button>
          </DialogTrigger>
        </div>
        <DialogContent
          className="max-h-[85vh] w-screen max-w-5xl! overflow-hidden p-0"
          onCloseAutoFocus={(event) => {
            if (!preventCloseAutoFocus.current) return

            event.preventDefault()
            preventCloseAutoFocus.current = false
          }}
        >
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{t('modules.addModule')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('modules.addModuleDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 px-6 pb-6">
            <div className="grid gap-3">
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('modules.searchModules')}
              />
              {categories.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedCategory === ALL_CATEGORIES ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                  >
                    {t('common.all')}
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {t(category)}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
            <ScrollArea className="h-[58vh] rounded-md border">
              <div className="grid gap-5 p-3">
              <section className="grid gap-3">
                <h3 className="text-sm font-medium">{t('modules.savedModules')}</h3>
                {filteredExistingModules.length > 0 ? (
                  <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredExistingModules.map((module) => (
                      <ContextMenu key={`${module.value.contentType}:${module.id}`}>
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left shadow-xs transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/50 hover:bg-accent hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-hidden"
                            onClick={() => handleAdd(module.fieldName, module.value)}
                          >
                            <ModulePreviewImage src={module.preview} />
                            <div className="grid w-full min-w-0 gap-3 p-4">
                              <div className="flex min-w-0 items-start gap-3">
                                <ModuleIcon icon={module.icon} />
                                <div className="grid min-w-0 gap-1">
                                  <span className="wrap-break-word text-sm font-medium leading-5">
                                    {module.title}
                                  </span>
                                  <span className="truncate text-xs text-muted-foreground">
                                    {t(module.moduleTitle)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex min-w-0 flex-wrap gap-1.5">
                                <Badge variant="secondary">{t('common.global')}</Badge>
                                <Badge variant="outline">{t(module.category)}</Badge>
                              </div>
                            </div>
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem disabled={!module.canEdit} asChild={module.canEdit}>
                            {module.canEdit ? (
                              <ManagerLink
                                href={`/${module.contentTypeName}/${module.id}`}
                                onClick={() => handleOpenChange(false)}
                              >
                                <Pencil />
                                {t('common.edit')}
                              </ManagerLink>
                            ) : (
                              <>
                                <Pencil />
                                {t('common.edit')}
                              </>
                            )}
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            disabled={!module.canDelete}
                            onSelect={() => setDeleteTarget(module)}
                          >
                            <Trash2 />
                            {t('common.delete')}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                ) : isLoadingExistingModules ? (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                    {t('modules.loadingSaved')}
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                    {t('modules.noSavedFound')}
                  </div>
                )}
              </section>
              <section className="grid gap-3">
                <h3 className="text-sm font-medium">{t('modules.allModules')}</h3>
                {filteredOptions.length > 0 ? (
                  <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredOptions.map((option) => (
                      <button
                        key={option.fieldName}
                        type="button"
                        className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-md border bg-card text-left shadow-xs transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/50 hover:bg-accent hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-hidden"
                        onClick={() => handleAdd(option.fieldName)}
                      >
                        <ModulePreviewImage src={option.preview} />
                        <div className="grid w-full min-w-0 gap-3 p-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <ModuleIcon icon={option.icon} />
                            <div className="grid min-w-0 gap-1">
                              <span className="wrap-break-word text-sm font-medium leading-5">
                                {t(option.title)}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {t(option.category)}
                              </span>
                            </div>
                          </div>
                          {option.description ? (
                            <p className="wrap-break-word text-sm leading-5 text-muted-foreground">
                              {t(option.description)}
                            </p>
                          ) : null}
                          {option.props.length > 0 ? (
                            <div className="flex min-w-0 flex-wrap gap-1.5">
                              {option.props.map((prop) => (
                                <Badge key={prop.name} variant="secondary">
                                  <span className="truncate">{prop.label}</span>
                                  {prop.required ? (
                                    <>
                                      <span aria-hidden="true" className="text-destructive">
                                        {REQUIRED_MARK}
                                      </span>
                                      <span className="sr-only">{t('common.required')}</span>
                                    </>
                                  ) : null}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    {t('modules.noModulesFound')}
                  </div>
                )}
              </section>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modules.deleteSavedModule')}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t('modules.deleteSavedConfirm', { title: deleteTarget.title })
                : t('modules.deleteSavedConfirmGeneric')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={deleteModule.isPending}
              onClick={() => void handleDelete()}
            >
              {t('contentList.deletePermanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
