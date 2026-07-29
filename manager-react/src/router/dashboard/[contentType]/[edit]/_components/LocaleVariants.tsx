'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckIcon,
  Eye,
  EyeOff,
  GitBranchPlus,
  Link2Off,
  Pencil,
  Plus,
  RotateCcw,
  Rocket,
  Star,
  Trash2,
} from 'lucide-react'
import type { ListContentVersionsOutput } from '@rakun-kit/core/client'
import { useTranslations } from '@/i18n'

import { useEditPageContext } from '../_context/EditPageContext'
import { VariantNameDialog } from './VariantNameDialog'

import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useManagerNavigation } from '@/state/navigation'
import { useQueryClient } from '@tanstack/react-query'

const reviewBadgeVariant = (status?: string) => {
  if (status === 'approved') return 'default' as const
  if (status === 'changes_requested') return 'destructive' as const
  return 'secondary' as const
}

const LocaleMultiSelect = ({
  options,
  value,
  onValueChange,
}: {
  options: Array<{ value: string; label: string; active: boolean }>
  value: string[]
  onValueChange: (value: string[]) => void
}) => {
  const t = useTranslations()
  const labelsByValue = new Map(options.map((option) => [option.value, option.label]))
  const remove = (removedValue: string) =>
    onValueChange(value.filter((item) => item !== removedValue))
  const toggle = (selectedValue: string) =>
    value.includes(selectedValue) ? remove(selectedValue) : onValueChange([...value, selectedValue])

  return (
    <Tags className="min-w-64 max-w-md">
      <TagsTrigger placeholder={t('variants.selectLocales')}>
        {value.map((selectedValue) => (
          <TagsValue key={selectedValue} onRemove={() => remove(selectedValue)}>
            {labelsByValue.get(selectedValue) ?? selectedValue}
          </TagsValue>
        ))}
      </TagsTrigger>
      <TagsContent>
        <TagsInput placeholder={t('variants.searchLocale')} />
        <TagsList>
          <TagsEmpty>{t('variants.noLocalesFound')}</TagsEmpty>
          <TagsGroup>
            {options.map((option) => (
              <TagsItem key={option.value} value={option.value} onSelect={toggle}>
                <span>
                  {option.label}
                  {option.active ? (
                    <span className="text-muted-foreground"> {'\u00B7'} {t('variants.currentlyActive')}</span>
                  ) : null}
                </span>
                {value.includes(option.value) ? (
                  <CheckIcon className="text-muted-foreground" size={14} />
                ) : null}
              </TagsItem>
            ))}
          </TagsGroup>
        </TagsList>
      </TagsContent>
    </Tags>
  )
}

export const ContentVariants = () => {
  const t = useTranslations()
  const {
    contentTypeId,
    contentTypeName,
    handleVisibilityChange,
    isTrashed,
    languageCode,
    languageList,
    localeVariantRoute,
  } = useEditPageContext()
  const navigation = useManagerNavigation()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [showTrashed, setShowTrashed] = useState(false)
  const [variantToTrash, setVariantToTrash] = useState<{
    documentId: string
    label: string
  } | null>(null)
  const [variantToDelete, setVariantToDelete] = useState<{
    documentId: string
    label: string
  } | null>(null)
  const [localesByDocument, setLocalesByDocument] = useState<Record<string, string[]>>({})
  const listInput =
    contentTypeId && localeVariantRoute
      ? {
          contentType: contentTypeName,
          documentId: contentTypeId,
          routeKey: localeVariantRoute.key,
        }
      : undefined
  const versionsQuery = useManagerQuery({
    name: 'manager.contentVersions.list',
    input: listInput ?? ({ contentType: contentTypeName, documentId: '' } as never),
    enabled: Boolean(listInput && !isTrashed),
  })
  const createMutation = useManagerMutation('manager.contentVersions.create')
  const promoteMutation = useManagerMutation('manager.contentVersions.promote')
  const assignMutation = useManagerMutation('manager.localeVariants.assign')
  const unassignMutation = useManagerMutation('manager.localeVariants.unassign')
  const setPrimaryMutation = useManagerMutation('manager.localeVariants.setPrimary')
  const trashVariantMutation = useManagerMutation('manager.localeVariants.trash')
  const restoreVariantMutation = useManagerMutation('manager.localeVariants.restore')
  const deleteVariantMutation = useManagerMutation('manager.delete')
  const versions = versionsQuery.data as ListContentVersionsOutput | undefined
  const documents = versions?.documents ?? []
  const trashedVariantsCount = documents.filter(
    (document) => document.visibility === 'trash'
  ).length
  const visibleDocuments = showTrashed
    ? documents
    : documents.filter((document) => document.visibility !== 'trash')
  const hasPublishedVersion = (versions?.documents ?? []).some(
    (document) => document.visibility === 'published'
  )
  const assignedLanguageCodes = useMemo(
    () =>
      new Set(
        (versions?.documents ?? []).flatMap((document) =>
          document.assignedLanguages.map((language) => language.code)
        )
      ),
    [versions?.documents]
  )

  const invalidate = async () => {
    if (!listInput) return
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.contentVersions.list', listInput),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [, name, input] = query.queryKey as [string?, string?, { contentType?: string }?]
          return name === 'manager.localeVariants.list' && input?.contentType === contentTypeName
        },
      }),
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [, name, input] = query.queryKey as [string?, string?, { contentType?: string }?]
          return name === 'manager.list' && input?.contentType === contentTypeName
        },
      }),
    ])
  }

  const createVersion = async (name: string) => {
    if (!contentTypeId || !localeVariantRoute) return
    try {
      const result = await createMutation.mutateAsync({
        contentType: contentTypeName,
        documentId: contentTypeId,
        name,
        routeKey: localeVariantRoute.key,
      })
      await invalidate()
      setCreateDialogOpen(false)
      toast.success(t('variants.draftVariantCreated'))
      const nextId = result.document._id
      if (typeof nextId === 'string') {
        navigation.push?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: nextId,
        })
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotCreate')))
    }
  }

  const moveLocale = async (
    documentId: string,
    approved: boolean,
    initialPublication: boolean,
    assignedLocales: string[]
  ) => {
    const selectedLocales = localesByDocument[documentId] ?? []
    const languageCodes = initialPublication
      ? assignedLocales.length
        ? assignedLocales
        : [languageCode]
      : selectedLocales
    if (!languageCodes.length || !localeVariantRoute) return
    try {
      if (approved) {
        await promoteMutation.mutateAsync({
          contentType: contentTypeName,
          documentId,
          routeKey: localeVariantRoute.key,
          languageCodes,
        })
        if (documentId === contentTypeId) {
          handleVisibilityChange('published')
        }
        toast.success(initialPublication ? t('variants.pagePublished') : t('variants.variantPromoted'))
      } else {
        await assignMutation.mutateAsync({
          contentType: contentTypeName,
          documentId,
          routeKey: localeVariantRoute.key,
          languageCodes,
        })
        toast.success(t('variants.localeMoved'))
      }
      setLocalesByDocument((current) => ({ ...current, [documentId]: [] }))
      await invalidate()
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotMoveLocale')))
    }
  }

  const unassignLanguage = async (documentId: string, locale: string) => {
    if (!localeVariantRoute) return
    try {
      await unassignMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
        languageCodes: [locale],
      })
      await invalidate()
      toast.success(t('variants.localeUnassigned'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotUnassignLocale')))
    }
  }

  const setAsPrimary = async (documentId: string) => {
    if (!localeVariantRoute) return
    try {
      await setPrimaryMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
      })
      await invalidate()
      toast.success(t('variants.primaryUpdated'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotSetPrimary')))
    }
  }

  const trashVariant = async () => {
    if (!variantToTrash || !localeVariantRoute) return
    try {
      const documentId = variantToTrash.documentId
      const result = await trashVariantMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
      })
      setVariantToTrash(null)
      await invalidate()
      toast.success(t('variants.movedToTrash'))

      if (documentId === contentTypeId) {
        navigation.replace?.({
          name: 'content.edit',
          contentType: contentTypeName,
          id: result.primaryDocumentId,
        })
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotMoveToTrash')))
    }
  }

  const restoreVariant = async (documentId: string) => {
    if (!localeVariantRoute) return
    try {
      await restoreVariantMutation.mutateAsync({
        contentType: contentTypeName,
        documentId,
        routeKey: localeVariantRoute.key,
      })
      await invalidate()
      toast.success(t('variants.restored'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('variants.couldNotRestore')))
    }
  }

  const deleteVariantPermanently = async () => {
    if (!variantToDelete) return
    try {
      await deleteVariantMutation.mutateAsync({
        contentType: contentTypeName,
        id: variantToDelete.documentId,
      })
      setVariantToDelete(null)
      await invalidate()
      toast.success(t('variants.permanentlyDeleted'))
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, t('variants.couldNotDelete'))
      )
    }
  }

  if (!contentTypeId || !localeVariantRoute) {
    return (
      <div className="text-muted-foreground text-sm">
        {t('variants.availableForRouteable')}
      </div>
    )
  }
  if (versionsQuery.isLoading) {
    return <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <VariantNameDialog
        open={createDialogOpen}
        loading={createMutation.isPending}
        onOpenChange={setCreateDialogOpen}
        onConfirm={createVersion}
      />
      <Dialog
        open={Boolean(variantToTrash)}
        onOpenChange={(open) => {
          if (!open && !trashVariantMutation.isPending) {
            setVariantToTrash(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('variants.moveToTrashTitle')}</DialogTitle>
            <DialogDescription>
              {variantToTrash
                ? t('variants.moveToTrashConfirm', { label: variantToTrash.label })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={trashVariantMutation.isPending}
              onClick={() => setVariantToTrash(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={trashVariantMutation.isPending}
              onClick={() => void trashVariant()}
            >
              <Trash2 />
              {t('variants.moveVariantToTrash')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(variantToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteVariantMutation.isPending) {
            setVariantToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('variants.deletePermanentlyTitle')}</DialogTitle>
            <DialogDescription>
              {variantToDelete
                ? t('variants.deletePermanentlyConfirm', { label: variantToDelete.label })
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteVariantMutation.isPending}
              onClick={() => setVariantToDelete(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              loading={deleteVariantMutation.isPending}
              onClick={() => void deleteVariantPermanently()}
            >
              <Trash2 />
              {t('contentList.deletePermanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap gap-2">
        <Button loading={createMutation.isPending} onClick={() => setCreateDialogOpen(true)}>
          <GitBranchPlus />
          {t('variants.createDraftVariant')}
        </Button>
        {trashedVariantsCount ? (
          <Button variant="outline" onClick={() => setShowTrashed((current) => !current)}>
            {showTrashed ? <EyeOff /> : <Eye />}
            {showTrashed
              ? t('variants.hideTrashed')
              : t('variants.showTrashed', { count: trashedVariantsCount })}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3">
        {visibleDocuments.map((document) => {
          const selectedLocales = localesByDocument[document.documentId] ?? []
          const isCurrent = document.documentId === contentTypeId
          const approved = document.reviewStatus === 'approved'
          const reviewPending =
            document.reviewStatus === 'pending' ||
            document.reviewStatus === 'changes_requested' ||
            document.reviewStatus === 'outdated'
          const reviewBlocked = document.reviewRequired && !approved
          const initialPublication =
            approved && document.visibility === 'draft' && !hasPublishedVersion
          const assignedLocales = document.assignedLanguages.map((language) => language.code)
          const isVariantTrashed = document.visibility === 'trash'

          return (
            <Card
              key={document.documentId}
              className={`rounded-lg py-4 ${isCurrent ? 'border-primary bg-primary/5' : ''}`}
            >
              <CardHeader className="flex-row items-start justify-between gap-4 px-4">
                <div className="min-w-0">
                  <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <span className="truncate">{document.label}</span>
                    {isCurrent ? <Badge>{t('variants.current')}</Badge> : null}
                    <Badge variant={document.role === 'primary' ? 'default' : 'secondary'}>
                      {document.role}
                    </Badge>
                    {document.visibility ? (
                      <Badge variant="outline">{document.visibility}</Badge>
                    ) : null}
                    {document.reviewStatus ? (
                      <Badge variant={reviewBadgeVariant(document.reviewStatus)}>
                        {document.reviewStatus.replaceAll('_', ' ')}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <div className="text-muted-foreground mt-1 font-mono text-xs">
                    {document.documentId}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2">
                  {!isCurrent && !isVariantTrashed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigation.push?.({
                          name: 'content.edit',
                          contentType: contentTypeName,
                          id: document.documentId,
                        })
                      }
                    >
                      <Pencil />
                      {t('common.edit')}
                    </Button>
                  ) : null}
                  {document.role === 'variant' && isVariantTrashed ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={
                          restoreVariantMutation.isPending &&
                          restoreVariantMutation.variables?.documentId ===
                            document.documentId
                        }
                        disabled={
                          restoreVariantMutation.isPending ||
                          deleteVariantMutation.isPending ||
                          setPrimaryMutation.isPending ||
                          trashVariantMutation.isPending
                        }
                        onClick={() => void restoreVariant(document.documentId)}
                      >
                        <RotateCcw />
                        {t('common.restore')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={
                          restoreVariantMutation.isPending ||
                          deleteVariantMutation.isPending
                        }
                        onClick={() =>
                          setVariantToDelete({
                            documentId: document.documentId,
                            label: document.label,
                          })
                        }
                      >
                        <Trash2 />
                        {t('contentList.deletePermanently')}
                      </Button>
                    </>
                  ) : document.role === 'variant' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={
                          setPrimaryMutation.isPending &&
                          setPrimaryMutation.variables?.documentId === document.documentId
                        }
                        disabled={setPrimaryMutation.isPending || trashVariantMutation.isPending}
                        onClick={() => void setAsPrimary(document.documentId)}
                      >
                        <Star />
                        {t('variants.setAsPrimary')}
                      </Button>
                      <Button
                        aria-label={`Move ${document.label} to trash`}
                        title={`Move ${document.label} to trash`}
                        variant="destructive"
                        size="sm"
                        disabled={setPrimaryMutation.isPending || trashVariantMutation.isPending}
                        onClick={() =>
                          setVariantToTrash({
                            documentId: document.documentId,
                            label: document.label,
                          })
                        }
                      >
                        <Trash2 />
                        {t('contentList.moveToTrash')}
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4">
                {isVariantTrashed ? (
                  <p className="text-sm text-muted-foreground">
                    {t('variants.inTrashHint')}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {document.assignedLanguages.length ? (
                        document.assignedLanguages.map((language) => (
                          <Button
                            key={language.code}
                            variant="outline"
                            size="sm"
                            disabled={unassignMutation.isPending}
                            onClick={() =>
                              void unassignLanguage(document.documentId, language.code)
                            }
                          >
                            <Link2Off />
                            {language.code}
                            {language.code === languageCode ? (
                              <Badge variant="secondary" className="ml-1">
                                {t('variants.current')}
                              </Badge>
                            ) : null}
                          </Button>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t('variants.noLocaleAssignments')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!initialPublication ? (
                        <div className="flex min-w-64 flex-col gap-1">
                          <LocaleMultiSelect
                            options={languageList.map((language) => ({
                              value: language.code,
                              label: `${language.code} ${language.name}`,
                              active: assignedLanguageCodes.has(language.code),
                            }))}
                            value={selectedLocales}
                            onValueChange={(value) =>
                              setLocalesByDocument((current) => ({
                                ...current,
                                [document.documentId]: value,
                              }))
                            }
                          />
                          {assignedLanguageCodes.size ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="self-start"
                              onClick={() =>
                                setLocalesByDocument((current) => ({
                                  ...current,
                                  [document.documentId]: Array.from(assignedLanguageCodes),
                                }))
                              }
                            >
                              {t('variants.selectAllActiveLocales')}
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-muted-foreground flex items-center text-sm">
                          {t('variants.newPagePublishIn', { language: languageCode })}
                        </div>
                      )}
                      <Button
                        variant={approved ? 'default' : 'outline'}
                        loading={promoteMutation.isPending || assignMutation.isPending}
                        disabled={
                          (!initialPublication && !selectedLocales.length) ||
                          reviewPending ||
                          reviewBlocked
                        }
                        onClick={() =>
                          void moveLocale(
                            document.documentId,
                            approved,
                            initialPublication,
                            assignedLocales
                          )
                        }
                      >
                        {approved ? <Rocket /> : <Plus />}
                        {approved
                          ? initialPublication
                            ? 'Publish page'
                            : 'Promote'
                          : reviewBlocked
                            ? 'Review required'
                            : 'Move locale'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
