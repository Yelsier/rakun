'use client'
import { useQuery } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import { Archive, Languages, Plus, RotateCcw, Search, Trash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Permission } from '@rakun-kit/core/client'
import { toast } from 'sonner'

import { columns } from './columns'
import DeleteCT from './delete'

import { ManagerLink } from '@/link'
import { PaginationController } from '@/components/PaginationController'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
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
import { useLanguage } from '@/state/language'
import { useTRPC } from '@/components/trpc-provider'
import { useSession } from '@/state/session'
import { useManagerMutation } from '@/client/react'

const getActionErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message

  if (!error || typeof error !== 'object') {
    return 'Action failed'
  }

  const cause = (error as { cause?: unknown }).cause

  if (cause && typeof cause === 'object') {
    const message = (cause as { message?: unknown; reason?: unknown }).message
    const reason = (cause as { message?: unknown; reason?: unknown }).reason

    if (typeof message === 'string') return message
    if (typeof reason === 'string') return reason
  }

  return 'Action failed'
}

const getContentRowId = (row: object, index: number) => {
  const id = (row as { _id?: unknown })._id
  return typeof id === 'string' ? id : String(index)
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const ContentListTableSkeleton = ({
  fieldsCount,
  showVisibility,
  enableSelection,
}: {
  fieldsCount: number
  showVisibility: boolean
  enableSelection: boolean
}) => {
  const columnCount = 2 + fieldsCount + (showVisibility ? 1 : 0) + (enableSelection ? 1 : 0)

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
}> = ({ contentType, fields, documentVisibility }) => {
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isTrash, setIsTrash] = useState(false)
  const [deleteItem, setDeleteItem] = useState<{ _id: string } | null>(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState<{
    _id: string
  } | null>(null)
  const [restoreItem, setRestoreItem] = useState<Record<string, unknown> | null>(null)
  const [duplicatingItemId, setDuplicatingItemId] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkTranslationOpen, setBulkTranslationOpen] = useState(false)
  const [isBulkTranslating, setIsBulkTranslating] = useState(false)
  const { getTranslation, language, languageList } = useLanguage()
  const [bulkTranslationSource, setBulkTranslationSource] = useState(language.code)
  const [bulkTranslationTargets, setBulkTranslationTargets] = useState<string[]>(() =>
    languageList.filter((item) => item.code !== language.code).map((item) => item.code)
  )
  const [bulkTranslationOverwrite, setBulkTranslationOverwrite] = useState(false)
  const trpc = useTRPC()
  const { hasAnyPermission, hasPermissions } = useSession()
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
    }

    if (trimmedSearch && searchableFields.length > 0) {
      filter.$or = searchableFields.map((field) => ({
        [field]: {
          $regex: escapeRegExp(trimmedSearch),
          $options: 'i',
        },
      }))
    }

    return Object.keys(filter).length > 0 ? filter : undefined
  }, [isTrash, searchableFields, trimmedSearch])
  const { data, refetch } = useQuery(
    trpc.manager.list.queryOptions({
      contentType,
      query: {
        filter: listFilter,
        options: {
          limit: itemsPerPage,
          page,
          fields: fields
            ? [...fields, '_trashed', '_visibility', '_visibilityBeforeTrash']
            : undefined,
        },
      },
    })
  )
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
  const canBulkDelete = hasPermissions([`content.${contentType}.deleteAny` as Permission])
  const canBulkTranslate =
    !isTrash &&
    languageList.length > 1 &&
    hasAnyPermission([
      `content.${contentType}.own` as Permission,
      `content.${contentType}.updateAny` as Permission,
    ])
  const enableSelection = canBulkDelete || canBulkTranslate
  const bulkTranslationTargetOptions = languageList.filter(
    (item) => item.code !== bulkTranslationSource
  )

  useEffect(() => {
    setRowSelection({})
  }, [contentType, isTrash, debouncedSearch])

  useEffect(() => {
    setSearch('')
    setDebouncedSearch('')
  }, [contentType])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [contentType, isTrash, debouncedSearch])

  useEffect(() => {
    if (!enableSelection) {
      setRowSelection({})
    }
  }, [enableSelection])

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
    toast.success('Item restored')
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
      toast.success('Item duplicated')
      await refetch()
    } catch (error) {
      toast.error(getActionErrorMessage(error))
    } finally {
      setDuplicatingItemId(null)
    }
  }

  const bulkDeleteItems = async () => {
    if (selectedIds.length === 0) return

    setIsBulkDeleting(true)

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
      setBulkDeleteOpen(false)
      toast.success(
        `${successCount} item${successCount === 1 ? '' : 's'} ${
          isTrash ? 'deleted permanently' : 'moved to trash'
        }`
      )
    }

    if (failedCount > 0) {
      toast.error(
        `${failedCount} item${failedCount === 1 ? '' : 's'} failed. ${getActionErrorMessage(
          lastError
        )}`
      )
    }

    setIsBulkDeleting(false)
  }

  const bulkTranslateItems = async () => {
    if (selectedIds.length === 0) return

    if (bulkTranslationTargets.length === 0) {
      toast.error('Select at least one target language')
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
        `${successCount} item${successCount === 1 ? '' : 's'} translated (${translatedSegments} segment${translatedSegments === 1 ? '' : 's'})`
      )
    }

    if (failedCount > 0) {
      toast.error(
        `${failedCount} item${failedCount === 1 ? '' : 's'} failed. ${getActionErrorMessage(
          lastError
        )}`
      )
    }

    setIsBulkTranslating(false)
  }

  const typedData = data as { totalItems: number; items: object[] } | undefined
  const totalItems = typedData?.totalItems ?? 0
  const items = typedData?.items ?? []
  const canCreate = hasAnyPermission([
    `content.${contentType}.own` as Permission,
    `content.${contentType}.updateAny` as Permission,
  ])

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10">
      <Tabs
        value={isTrash ? 'trash' : 'active'}
        onValueChange={(value) => {
          setIsTrash(value === 'trash')
          setPage(1)
        }}
        className="w-full"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex gap-3 items-center">
            <TabsList variant="line">
              <TabsTrigger value="active">
                <Archive />
                Active
              </TabsTrigger>
              <TabsTrigger value="trash">
                <Trash />
                Trash
              </TabsTrigger>
            </TabsList>
            {searchableFields.length > 0 ? (
              <div className="flex min-w-52 max-w-md flex-1 items-center gap-2 rounded-md border px-3 py-1 sm:flex-none">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 border-0 shadow-none focus-visible:ring-0"
                  placeholder="Search..."
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canCreate && (
              <ManagerLink href={`/${contentType}/create`} data-tour="content-list-create">
                <Button>
                  <Plus />
                  Create
                </Button>
              </ManagerLink>
            )}
          </div>
        </div>
      </Tabs>
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
        {typedData ? (
          <DataTable
            columns={columns({
              fields: fields || [],
              contentType,
              getTranslation,
              setDeleteItem,
              setPermanentDeleteItem,
              setRestoreItem,
              onDuplicateItem: (item) => void duplicateItem(item),
              duplicatingItemId,
              enableSelection,
              showVisibility: Boolean(documentVisibility),
              isTrash,
              hasPermissions,
              hasAnyPermission,
            })}
            data={items as object[]}
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            getRowId={getContentRowId}
          />
        ) : (
          <ContentListTableSkeleton
            fieldsCount={(fields || []).length}
            showVisibility={Boolean(documentVisibility)}
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
                {selectedCount} selected
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
                      Translate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Translate selected items</DialogTitle>
                      <DialogDescription>
                        Translate supported fields for {selectedCount} selected item
                        {selectedCount === 1 ? '' : 's'}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Source language</Label>
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
                        <span className="text-sm">Overwrite existing translations</span>
                      </label>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkTranslationOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        loading={isBulkTranslating || translateDocumentMutation.isPending}
                        disabled={bulkTranslationTargets.length === 0}
                        onClick={() => void bulkTranslateItems()}
                      >
                        Translate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
              {canBulkDelete ? (
                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash />
                      {isTrash ? 'Delete permanently' : 'Move to trash'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {isTrash ? 'Delete selected permanently' : 'Move selected to trash'}
                      </DialogTitle>
                      <DialogDescription>
                        {isTrash
                          ? `This will permanently delete ${selectedCount} selected item${
                              selectedCount === 1 ? '' : 's'
                            }. This cannot be undone.`
                          : `This will move ${selectedCount} selected item${
                              selectedCount === 1 ? '' : 's'
                            } to trash.`}
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        loading={isBulkDeleting}
                        onClick={() => void bulkDeleteItems()}
                      >
                        {isTrash ? 'Delete permanently' : 'Move to trash'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {restoreItem ? (
        <div className="flex items-center justify-end gap-2 rounded-md border p-3">
          <span className="text-muted-foreground text-sm">Restore selected item?</span>
          <Button variant="outline" size="sm" onClick={() => setRestoreItem(null)}>
            Cancel
          </Button>
          <Button size="sm" loading={restoreMutation.isPending} onClick={() => void restore()}>
            <RotateCcw />
            Restore
          </Button>
        </div>
      ) : null}
      {typedData ? (
        <div className="mt-6">
          <PaginationController
            setPage={setPage}
            page={page}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      ) : null}
    </div>
  )
}
export default ListContents
