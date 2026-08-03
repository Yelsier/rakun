'use client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import { Archive, Languages, Plus, RotateCcw, Trash } from 'lucide-react'
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { LOCALE_VARIANT_ROLE_FIELD, type Permission } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import { columns } from './columns'
import DeleteCT from './delete'

import { ManagerLink } from '@/link'
import { PaginationController } from '@/components/PaginationController'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/search-input'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslations } from '@/i18n'
import { useLanguage } from '@/state/language'
import { useTRPC } from '@/components/trpc-provider'
import { useSession } from '@/state/session'
import { useManagerMutation } from '@/client/react'
import { confirm } from '@/components/confirm'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useManagerUsers } from '@/state/users'

const SEARCH_DEBOUNCE_MS = 300

const getContentRowId = (row: object, index: number) => {
  const id = (row as { _id?: unknown })._id
  return typeof id === 'string' ? id : String(index)
}

const getContentOwnerId = (row: object) => {
  const createdBy = (row as { createdBy?: unknown }).createdBy
  if (typeof createdBy === 'string') return createdBy
  if (
    createdBy &&
    typeof createdBy === 'object' &&
    typeof (createdBy as { _id?: unknown })._id === 'string'
  ) {
    return (createdBy as { _id: string })._id
  }
  return null
}

const ContentListSearch = memo(function ContentListSearch({
  resetKey,
  onDebouncedChange,
  className,
}: {
  resetKey: string
  onDebouncedChange: (value: string) => void
  className?: string
}) {
  const t = useTranslations()
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue('')
  }, [resetKey])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        onDebouncedChange(value)
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [onDebouncedChange, value])

  return (
    <SearchInput
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={t("contentList.search")}
      className={className}
    />
  )
})

const ContentListToolbar = memo(function ContentListToolbar({
  isTrash,
  onTrashChange,
  showSearch,
  contentType,
  canCreate,
  onDebouncedSearch,
}: {
  isTrash: boolean
  onTrashChange: (value: string) => void
  showSearch: boolean
  contentType: string
  canCreate: boolean
  onDebouncedSearch: (value: string) => void
}) {
  const t = useTranslations()
  return (
    <Tabs value={isTrash ? 'trash' : 'active'} onValueChange={onTrashChange} className="w-full">
      <div className="grid gap-3 border-b pb-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          <TabsList variant="line">
            <TabsTrigger value="active">
              <Archive />
              {t('contentList.active')}
            </TabsTrigger>
            <TabsTrigger value="trash">
              <Trash />
              {t('contentList.trash')}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex min-w-0 flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center md:contents">
          {showSearch ? (
            <ContentListSearch
              resetKey={contentType}
              onDebouncedChange={onDebouncedSearch}
              className="min-w-0 flex-1 md:max-w-md md:justify-self-end lg:w-md"
            />
          ) : (
            <div className="hidden min-w-0 flex-1 md:block" />
          )}
          {canCreate ? (
            <ManagerLink
              href={`/${contentType}/create`}
              data-tour="content-list-create"
              className="shrink-0 self-stretch min-[420px]:self-auto md:justify-self-end"
            >
              <Button className="w-full min-[420px]:w-auto">
                <Plus />
                {t('contentList.create')}
              </Button>
            </ManagerLink>
          ) : null}
        </div>
      </div>
    </Tabs>
  )
})

const ContentListTableSkeleton = ({
  fieldsCount,
  showVisibility,
  showVariantCount,
  enableSelection,
}: {
  fieldsCount: number
  showVisibility: boolean
  showVariantCount: boolean
  enableSelection: boolean
}) => {
  const columnCount =
    3 +
    fieldsCount +
    (showVisibility ? 1 : 0) +
    (showVariantCount ? 1 : 0) +
    (enableSelection ? 1 : 0)

  return (
    <div className="w-full overflow-hidden rounded-lg border">
      <div
        className="grid gap-4 border-b bg-muted px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columnCount }).map((_, index) => (
          <Skeleton key={`content-list-header-${index}`} className="h-4 w-20 max-w-full" />
        ))}
      </div>
      {Array.from({ length: 10 }).map((_, rowIndex) => (
        <div
          key={`content-list-row-${rowIndex}`}
          className="grid gap-4 border-b px-4 py-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columnCount }).map((_, columnIndex) => (
            <Skeleton
              key={`content-list-row-${rowIndex}-${columnIndex}`}
              className="h-4 w-full max-w-32"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

const ListContents: React.FC<{
  contentType: string
  fields?: string[]
  documentVisibility?: boolean
  hasPageRoutes?: boolean
}> = ({ contentType, fields, documentVisibility, hasPageRoutes }) => {
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [creatorFilterIds, setCreatorFilterIds] = useState<string[]>([])
  const [isTrash, setIsTrash] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ _id: string } | null>(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<{
    _id: string
  } | null>(null)
  const [restoreItem, setRestoreItem] = useState<Record<string, unknown> | null>(null)
  const [duplicatingItemId, setDuplicatingItemId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkTranslationOpen, setBulkTranslationOpen] = useState(false)
  const [isBulkTranslating, setIsBulkTranslating] = useState(false)
  const { getTranslation, language, languageList } = useLanguage()
  const t = useTranslations()
  const [bulkTranslationSource, setBulkTranslationSource] = useState(language.code)
  const [bulkTranslationTargets, setBulkTranslationTargets] = useState<string[]>(() =>
    languageList.filter((item) => item.code !== language.code).map((item) => item.code)
  )
  const [bulkTranslationOverwrite, setBulkTranslationOverwrite] = useState(false)
  const trpc = useTRPC()
  const { user, hasAnyPermission, hasPermissions } = useSession()
  const trimmedSearch = debouncedSearch.trim()
  const searchableFields = useMemo(() => {
    const searchFields = fields ?? []

    return Array.from(
      new Set(
        searchFields.flatMap((field) =>
          field.includes('.') ? [field] : [field, `${field}.${language.code}`]
        )
      )
    )
  }, [fields, language.code])
  const listFilter = useMemo(() => {
    const filter: Record<string, unknown> = {
      ...(isTrash ? { _trashed: true } : {}),
      ...(hasPageRoutes ? { [LOCALE_VARIANT_ROLE_FIELD]: { $ne: 'variant' } } : {}),
      ...(creatorFilterIds.length ? { createdBy: { $in: creatorFilterIds } } : {}),
    }

    if (trimmedSearch && searchableFields.length > 0) {
      filter.$or = searchableFields.map((field) => ({
        [field]: {
          $contains: trimmedSearch,
        },
      }))
    }

    return Object.keys(filter).length > 0 ? filter : undefined
  }, [creatorFilterIds, hasPageRoutes, isTrash, searchableFields, trimmedSearch])
  const { data, refetch, isPending, isPlaceholderData } = useQuery({
    ...trpc.manager.list.queryOptions({
      contentType,
      ...(hasPageRoutes && !isTrash ? { languageCode: language.code } : {}),
      query: {
        filter: listFilter,
        options: {
          limit: itemsPerPage,
          page,
          fields: fields
            ? [...fields, 'createdBy', '_trashed', '_visibility', '_visibilityBeforeTrash']
            : undefined,
        },
      },
    }),
    // Keep prior rows while filter/page/trash/content-type fetches settle so
    // `showInitialSkeleton` (isPending && !data) does not flash. Pair with
    // startTransition on navigation and list state updates.
    placeholderData: keepPreviousData,
  })
  const displaySnapshotRef = useRef({
    contentType,
    fields,
    documentVisibility,
    hasPageRoutes,
  })
  if (!isPlaceholderData) {
    displaySnapshotRef.current = {
      contentType,
      fields,
      documentVisibility,
      hasPageRoutes,
    }
  }
  const displayContentType = displaySnapshotRef.current.contentType
  const displayFields = displaySnapshotRef.current.fields
  const displayDocumentVisibility = displaySnapshotRef.current.documentVisibility
  const displayHasPageRoutes = displaySnapshotRef.current.hasPageRoutes
  const { users: creators, usersById: creatorsById } = useManagerUsers()
  const restoreMutation = useManagerMutation('manager.update')
  const duplicateMutation = useManagerMutation('manager.duplicate')
  const trashMutation = useManagerMutation('manager.trash')
  const permanentDeleteMutation = useManagerMutation('manager.delete')
  const translateDocumentMutation = useManagerMutation('manager.translateDocument')
  const selectedIds = useMemo(
    () =>
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([id]) => id),
    [rowSelection]
  )
  const selectedCount = selectedIds.length
  const typedData = data as { totalItems: number; items: object[] } | undefined
  const totalItems = typedData?.totalItems ?? 0
  const items = typedData?.items ?? []
  const hasDeleteAnyPermission = hasPermissions([
    `content.${displayContentType}.deleteAny` as Permission,
  ])
  const hasOwnPermission = hasPermissions([
    `content.${displayContentType}.own` as Permission,
  ])
  const selectedItems = selectedIds
    .map((id) => items.find((item) => (item as { _id?: unknown })._id === id))
    .filter((item): item is object => Boolean(item))
  const ownsEverySelectedItem =
    selectedCount > 0 &&
    selectedItems.length === selectedCount &&
    selectedItems.every((item) => getContentOwnerId(item) === user._id)
  const canBulkDelete = hasDeleteAnyPermission || (hasOwnPermission && ownsEverySelectedItem)
  const canSelectForBulkDelete = hasDeleteAnyPermission || hasOwnPermission
  const showVariantCount = Boolean(displayHasPageRoutes)
  const canBulkTranslate =
    !isTrash &&
    languageList.length > 1 &&
    hasAnyPermission([
      `content.${displayContentType}.own` as Permission,
      `content.${displayContentType}.updateAny` as Permission,
    ])
  const enableSelection = canSelectForBulkDelete || canBulkTranslate
  const bulkTranslationTargetOptions = languageList.filter(
    (item) => item.code !== bulkTranslationSource
  )

  useEffect(() => {
    setRowSelection((previous) => (Object.keys(previous).length === 0 ? previous : {}))
  }, [contentType, creatorFilterIds, isTrash, debouncedSearch])

  useEffect(() => {
    startTransition(() => {
      setDebouncedSearch((previous) => (previous === '' ? previous : ''))
      setCreatorFilterIds((previous) => (previous.length ? [] : previous))
      setPage((previous) => (previous === 1 ? previous : 1))
      setIsTrash((previous) => (previous ? false : previous))
    })
  }, [contentType])

  useEffect(() => {
    startTransition(() => {
      setPage((previous) => (previous === 1 ? previous : 1))
    })
  }, [creatorFilterIds, isTrash, debouncedSearch])

  useEffect(() => {
    if (!enableSelection) {
      setRowSelection((previous) => (Object.keys(previous).length === 0 ? previous : {}))
    }
  }, [enableSelection])

  const handleDebouncedSearch = useCallback((value: string) => {
    startTransition(() => {
      setDebouncedSearch((previous) => (previous === value ? previous : value))
    })
  }, [])

  const handleTrashChange = useCallback((value: string) => {
    startTransition(() => {
      setIsTrash(value === 'trash')
      setPage(1)
    })
  }, [])

  const setPageTransition = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    startTransition(() => {
      setPage(value)
    })
  }, [])

  const setItemsPerPageTransition = useCallback<Dispatch<SetStateAction<number>>>((value) => {
    startTransition(() => {
      setItemsPerPage(value)
    })
  }, [])

  const restore = async () => {
    if (!restoreItem) return

    await restoreMutation.mutateAsync({
      contentType,
      id: restoreItem._id as string,
      data: {
        _trashed: false,
        ...(restoreItem._visibility === 'trash'
          ? {
              _visibility: restoreItem._visibilityBeforeTrash ?? 'published',
            }
          : {}),
      },
    })
    toast.success(t('contentList.itemRestored'))
    setRestoreItem(null)
    await refetch()
  }

  const duplicateItem = async (item: Record<string, unknown>) => {
    const id = typeof item._id === 'string' ? item._id : null

    if (!id) return

    setDuplicatingItemId(id)

    try {
      await duplicateMutation.mutateAsync({
        contentType,
        id,
      })
      toast.success(t('contentList.itemDuplicated'))
      await refetch()
    } catch (error) {
      toast.error(getActionErrorMessage(error))
    } finally {
      setDuplicatingItemId(null)
    }
  }

  const bulkDeleteItems = async () => {
    if (selectedIds.length === 0) return

    await confirm({
      title: isTrash
        ? t('contentList.deleteSelectedTitle')
        : t('contentList.moveSelectedTitle'),
      description: isTrash
        ? t('contentList.deleteSelectedDescription', { count: selectedCount })
        : t('contentList.moveSelectedDescription', { count: selectedCount }),
      confirmLabel: isTrash
        ? t('contentList.deletePermanently')
        : t('contentList.moveToTrash'),
      variant: 'destructive',
      onConfirm: async () => {
        const mutation = isTrash ? permanentDeleteMutation : trashMutation
        let successCount = 0
        let failedCount = 0
        let lastError: unknown

        for (const id of selectedIds) {
          try {
            await mutation.mutateAsync({ contentType, id })
            successCount += 1
          } catch (error) {
            failedCount += 1
            lastError = error
          }
        }

        if (successCount > 0) {
          await refetch()
          setRowSelection({})
          toast.success(
            isTrash
              ? t('contentList.bulkDeleted', { count: successCount })
              : t('contentList.bulkMoved', { count: successCount }),
          )
        }

        if (failedCount > 0) {
          toast.error(
            t('contentList.bulkFailed', {
              count: failedCount,
              reason: getActionErrorMessage(lastError),
            }),
          )
          throw new Error('bulk delete partial failure')
        }
      },
    })
  }

  const bulkTranslateItems = async () => {
    if (selectedIds.length === 0) return

    if (bulkTranslationTargets.length === 0) {
      toast.error(t('contentList.selectTargetLanguage'))
      return
    }

    setIsBulkTranslating(true)

    let successCount = 0
    let failedCount = 0
    let translatedSegments = 0
    let lastError: unknown

    for (const id of selectedIds) {
      try {
        const result = await translateDocumentMutation.mutateAsync({
          contentType,
          id,
          from: bulkTranslationSource,
          to: bulkTranslationTargets,
          overwrite: bulkTranslationOverwrite,
        })
        successCount += 1
        translatedSegments += result.summary.translatedSegments
      } catch (error) {
        failedCount += 1
        lastError = error
      }
    }

    if (successCount > 0) {
      await refetch()
      setRowSelection({})
      setBulkTranslationOpen(false)
      toast.success(
        t('contentList.bulkTranslated', {
          count: successCount,
          segments: translatedSegments,
        })
      )
    }

    if (failedCount > 0) {
      toast.error(
        t('contentList.bulkFailed', {
          count: failedCount,
          reason: getActionErrorMessage(lastError),
        })
      )
    }

    setIsBulkTranslating(false)
  }

  const showInitialSkeleton = isPending && !typedData
  const canCreate = hasAnyPermission([
    `content.${contentType}.own` as Permission,
    `content.${contentType}.updateAny` as Permission,
  ])

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10">
      <ContentListToolbar
        isTrash={isTrash}
        onTrashChange={handleTrashChange}
        showSearch={searchableFields.length > 0}
        contentType={contentType}
        canCreate={canCreate}
        onDebouncedSearch={handleDebouncedSearch}
      />
      <DeleteCT
        refetch={refetch}
        setDeleteItem={setDeleteItem}
        ct={contentType}
        item={deleteItem}
        mode="trash"
      />
      <DeleteCT
        refetch={refetch}
        setDeleteItem={setPermanentDeleteItem}
        ct={contentType}
        item={permanentDeleteItem}
        mode="delete"
      />
      <div data-tour="content-list-table">
        {!showInitialSkeleton ? (
          <DataTable
            columns={columns({
              fields: displayFields || [],
              contentType: displayContentType,
              t,
              getTranslation,
              setDeleteItem,
              setPermanentDeleteItem,
              setRestoreItem,
              onDuplicateItem: (item) => void duplicateItem(item),
              duplicatingItemId,
              enableSelection,
              showVisibility: Boolean(displayDocumentVisibility),
              showVariantCount,
              creators,
              creatorsById,
              creatorFilterIds,
              onCreatorFilterChange: setCreatorFilterIds,
              currentUserId: user._id,
              isTrash,
              hasPermissions,
            })}
            data={items as object[]}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            getRowId={getContentRowId}
          />
        ) : (
          <ContentListTableSkeleton
            fieldsCount={(displayFields || []).length}
            showVisibility={Boolean(displayDocumentVisibility)}
            showVariantCount={showVariantCount}
            enableSelection={enableSelection}
          />
        )}
        {enableSelection && selectedCount > 0 ? (
          <div
            className="fixed bottom-12 left-1/2 z-40 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-3 duration-200"
            data-tour="content-list-selection-toolbar"
          >
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 shadow-lg">
              <span className="min-w-20 text-center text-muted-foreground text-sm">
                {t('contentList.selectedCount', { count: selectedCount })}
              </span>
              {canBulkTranslate ? (
                <Dialog open={bulkTranslationOpen} onOpenChange={setBulkTranslationOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkTranslationSource(language.code)
                        setBulkTranslationTargets(
                          languageList
                            .filter((item) => item.code !== language.code)
                            .map((item) => item.code)
                        )
                      }}
                    >
                      <Languages />
                      {t('contentList.translate')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('contentList.translateSelectedTitle')}</DialogTitle>
                      <DialogDescription>
                        {t('contentList.translateSelectedDescription', { count: selectedCount })}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>{t('contentList.sourceLanguage')}</Label>
                        <Select
                          value={bulkTranslationSource}
                          onValueChange={(value) => {
                            setBulkTranslationSource(value)
                            setBulkTranslationTargets((targets) =>
                              targets.filter((target) => target !== value)
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("contentList.selectSource")} />
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
                        <Label>{t('contentList.targetLanguages')}</Label>
                        <div className="grid max-h-56 gap-2 overflow-auto rounded-md border p-3">
                          {bulkTranslationTargetOptions.map((item) => {
                            const checked = bulkTranslationTargets.includes(item.code)

                            return (
                              <label
                                key={item.code}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(nextChecked) => {
                                    setBulkTranslationTargets((targets) =>
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
                          checked={bulkTranslationOverwrite}
                          onCheckedChange={(checked) =>
                            setBulkTranslationOverwrite(Boolean(checked))
                          }
                        />
                        <span className="text-sm">{t('contentList.overwriteTranslations')}</span>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkTranslationOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button
                        loading={isBulkTranslating || translateDocumentMutation.isPending}
                        disabled={bulkTranslationTargets.length === 0}
                        onClick={() => void bulkTranslateItems()}
                      >
                        {t('contentList.translate')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
              {canBulkDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void bulkDeleteItems()}
                >
                  <Trash />
                  {isTrash
                    ? t('contentList.deletePermanently')
                    : t('contentList.moveToTrash')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {restoreItem ? (
        <div className="flex items-center justify-end gap-2 rounded-md border p-3">
          <span className="text-muted-foreground text-sm">{t('contentList.restoreSelected')}</span>
          <Button variant="outline" size="sm" onClick={() => setRestoreItem(null)}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" loading={restoreMutation.isPending} onClick={() => void restore()}>
            <RotateCcw />
            {t('common.restore')}
          </Button>
        </div>
      ) : null}
      {!showInitialSkeleton ? (
        <div className="mt-6">
          <PaginationController
            setPage={setPageTransition}
            page={page}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPageTransition}
          />
        </div>
      ) : null}
    </div>
  )
}
export default ListContents
