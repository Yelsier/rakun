'use client'

import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  GitBranch,
  Languages,
  Monitor,
  MoreVertical,
  PanelLeft,
  RotateCcw,
  Star,
  Trash,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { DocumentTranslationDialog } from './DocumentTranslationDialog'
import { ContentCommentsDrawer } from './ContentCommentsDrawer'
import { useEditPageContext } from '../_context/EditPageContext'
import type { EditableDocumentVisibility } from '../edit.types'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from '@/components/ui/sidebar'
import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { useTranslations } from '@/i18n'
import { cn } from '@/lib/utils'
import { useManagerNavigation } from '@/state/navigation'
import { useContentCollaboration } from '@/collaboration/ContentCollaborationProvider'

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

const FavoriteMenuItem = () => {
  const t = useTranslations()
  const { contentTypeId, contentTypeName, isTrashed } = useEditPageContext()
  const queryClient = useQueryClient()
  const favoriteInput = contentTypeId
    ? {
        contentType: contentTypeName,
        documentId: contentTypeId,
      }
    : undefined
  const favoriteQuery = useManagerQuery({
    name: 'manager.favorites.list',
    input: favoriteInput,
    enabled: Boolean(favoriteInput && !isTrashed),
  })
  const toggleFavoriteMutation = useManagerMutation('manager.favorites.toggle')
  const isFavorite = (favoriteQuery.data?.favorites.length ?? 0) > 0
  const label = isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')

  const invalidateFavorites = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: createManagerQueryKey('manager.favorites.list', undefined),
      }),
      favoriteInput
        ? queryClient.invalidateQueries({
            queryKey: createManagerQueryKey('manager.favorites.list', favoriteInput),
          })
        : Promise.resolve(),
    ])
  }

  const handleToggleFavorite = async () => {
    if (!favoriteInput) return

    try {
      const result = await toggleFavoriteMutation.mutateAsync({
        ...favoriteInput,
        favorite: !isFavorite,
      })
      await invalidateFavorites()
      toast.success(result.favorite ? t('common.addedToFavorites') : t('dashboard.removedFavorite'))
    } catch (error) {
      toast.error(getActionErrorMessage(error, t('common.couldNotUpdateFavorite')))
    }
  }

  if (!contentTypeId || isTrashed) return null

  return (
    <DropdownMenuItem
      disabled={toggleFavoriteMutation.isPending || favoriteQuery.isLoading}
      onSelect={() => void handleToggleFavorite()}
    >
      <Star className={cn(isFavorite && 'fill-amber-400 text-amber-500')} />
      {label}
    </DropdownMenuItem>
  )
}

export const EditToolbar = ({
  compactEditorAvailable,
  compactEditorOpen,
  onCompactEditorOpenChange,
}: {
  compactEditorAvailable: boolean
  compactEditorOpen: boolean
  onCompactEditorOpenChange: (open: boolean) => void
}) => {
  const t = useTranslations()
  const collaboration = useContentCollaboration()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const navigation = useManagerNavigation()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const {
    activeTab,
    contentTypeId,
    contentTypeName,
    discardPending,
    documentActions,
    editableVisibility,
    handleVisibilityChange,
    hasLocaleVariants,
    hasVisibility,
    isTrashed,
    languageCode,
    openMoveToTrashDialog,
    openDiscardChangesDialog,
    openPermanentDeleteDialog,
    publicUrl,
    showSaveErrorTooltip,
    template,
    translation,
    translationEnabled,
  } = useEditPageContext()
  const collaborationStatus =
    activeTab === 'template' && template.state?.canUpdate
      ? template.collaborationStatus
      : collaboration?.status
  const VisibilityIcon = visibilityIcons[editableVisibility]
  const pending = documentActions.pending
  const savePending =
    pending.create ||
    pending.update ||
    pending.collaboration ||
    pending.delete ||
    pending.trash ||
    pending.version ||
    pending.promote ||
    template.pending
  const canSaveAsDraft = hasVisibility && contentTypeId && !isTrashed
  const canSaveAsVariant = hasLocaleVariants && !isTrashed
  const hasSaveOptions = canSaveAsDraft || canSaveAsVariant
  const commentsEnabled = Boolean(contentTypeId)
  const hasMoreActions = Boolean(contentTypeId) || translationEnabled || isTrashed
  const hasPrimaryMenuActions = Boolean(contentTypeId && !isTrashed) || translationEnabled

  const exitToList = () => {
    if (isMobile) setOpenMobile(true)
    else setOpen(true)

    const route = { name: 'content.list' as const, contentType: contentTypeName }
    const listHref = navigation.href(route)
    if (navigation.pushPath) navigation.pushPath(listHref)
    else navigation.push?.(route)
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setCommentsOpen(search.get('comments') === 'open' || search.get('review') === 'open')
  }, [contentTypeId])

  const openTranslationDialog = () => {
    translation.reset()
    translation.setSource(languageCode)
    translation.setOpen(true)
  }

  return (
    <div className="z-50 flex shrink-0 flex-wrap items-center gap-2 bg-background pb-3">
      <div className="flex min-w-0 flex-[1_1_20rem] flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={t('contentEdit.backToList')}
              size="icon"
              variant="outline"
              onClick={exitToList}
            >
              <ArrowLeft />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('contentEdit.backToList')}</TooltipContent>
        </Tooltip>
        {compactEditorAvailable ? (
          <div>
            <Button
              size="sm"
              variant={compactEditorOpen ? 'secondary' : 'outline'}
              aria-pressed={compactEditorOpen}
              onClick={() => onCompactEditorOpenChange(!compactEditorOpen)}
            >
              {compactEditorOpen ? <Monitor /> : <PanelLeft />}
              {compactEditorOpen ? t('common.preview') : t('common.edit')}
            </Button>
          </div>
        ) : null}
        {hasVisibility && !isTrashed ? (
          <div data-tour="content-edit-visibility" className="min-w-0">
            <Select
              value={editableVisibility}
              onValueChange={(value) => handleVisibilityChange(value as EditableDocumentVisibility)}
            >
              <SelectTrigger
                className={cn(
                  'w-[min(100%,9rem)] md:w-36',
                  visibilitySelectStyles[editableVisibility]
                )}
              >
                <VisibilityIcon className="text-current" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('visibility.draft')}</SelectItem>
                <SelectItem value="hidden">{t('visibility.hidden')}</SelectItem>
                <SelectItem value="published">{t('visibility.published')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {publicUrl ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild aria-label={t('contentEdit.viewPage')} size="icon" variant="outline">
                <a href={publicUrl} rel="noreferrer" target="_blank">
                  <ExternalLink />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('contentEdit.viewPage')}</TooltipContent>
          </Tooltip>
        ) : null}
        {commentsEnabled ? (
          <ContentCommentsDrawer open={commentsOpen} onOpenChange={setCommentsOpen} />
        ) : null}
        {hasMoreActions ? (
          <>
            <DocumentTranslationDialog trigger={false} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={t('contentEdit.moreActions')}
                  variant="outline"
                  size="icon"
                  data-tour="content-edit-actions"
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-52">
                <FavoriteMenuItem />
                {translationEnabled ? (
                  <DropdownMenuItem disabled={pending.translate} onSelect={openTranslationDialog}>
                    <Languages />
                    {t('contentList.translate')}
                  </DropdownMenuItem>
                ) : null}
                {hasPrimaryMenuActions && (contentTypeId || isTrashed) ? (
                  <DropdownMenuSeparator />
                ) : null}
                {isTrashed ? (
                  <>
                    <DropdownMenuItem
                      disabled={pending.update}
                      onSelect={() => void documentActions.handleRestoreFromTrash()}
                    >
                      <RotateCcw />
                      {t('contentEdit.restoreFromTrash')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending.delete}
                      variant="destructive"
                      onSelect={openPermanentDeleteDialog}
                    >
                      <Trash />
                      {t('contentList.deletePermanently')}
                    </DropdownMenuItem>
                  </>
                ) : contentTypeId ? (
                  <DropdownMenuItem
                    disabled={pending.trash}
                    variant="destructive"
                    onSelect={openMoveToTrashDialog}
                  >
                    <Trash />
                    {t('contentList.moveToTrash')}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>
      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
        {collaborationStatus ? (
          <span
            aria-live="polite"
            className={cn(
              'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
              collaborationStatus === 'error' && 'text-destructive'
            )}
          >
            <span
              aria-hidden
              className={cn(
                'size-2 rounded-full bg-emerald-500',
                collaborationStatus === 'unsaved' && 'bg-amber-500',
                collaborationStatus === 'offline' && 'bg-amber-500',
                collaborationStatus === 'error' && 'bg-destructive'
              )}
            />
            {t(`contentEdit.collaboration.${collaborationStatus}`)}
          </span>
        ) : null}
        {hasSaveOptions ? (
          <div
            className="inline-flex overflow-hidden rounded-md shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50"
            data-tour="content-edit-save"
          >
            <Tooltip open={showSaveErrorTooltip}>
              <TooltipTrigger asChild>
                <Button
                  loading={savePending}
                  disabled={discardPending}
                  className="cursor-pointer rounded-none shadow-none focus-visible:z-10 focus-visible:ring-0"
                  onClick={() => void documentActions.handleSave()}
                >
                  {t('common.save')}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                {t('contentEdit.formHasErrors')}
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={t('contentEdit.saveOptions')}
                  disabled={savePending || discardPending}
                  className="w-9 rounded-none border-l border-primary-foreground/25 px-0! shadow-none focus-visible:z-10 focus-visible:ring-0"
                >
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canSaveAsVariant ? (
                  <DropdownMenuItem onClick={() => void documentActions.handleSaveAsVariant()}>
                    <GitBranch />
                    {t('contentEdit.saveAsVariant')}
                  </DropdownMenuItem>
                ) : null}
                {canSaveAsDraft ? (
                  <DropdownMenuItem onClick={() => void documentActions.handleSaveAsDraft()}>
                    <Copy />
                    {t('contentEdit.saveAsDraft')}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Tooltip open={showSaveErrorTooltip}>
            <TooltipTrigger asChild>
              <Button
                loading={savePending}
                disabled={discardPending}
                className="cursor-pointer"
                onClick={() => void documentActions.handleSave()}
                data-tour="content-edit-save"
              >
                {t('common.save')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {t('contentEdit.formHasErrors')}
            </TooltipContent>
          </Tooltip>
        )}
        {contentTypeId && !isTrashed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t('contentEdit.discardChanges')}
                loading={discardPending}
                disabled={savePending}
                size="icon"
                variant="outline"
                onClick={openDiscardChangesDialog}
              >
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('contentEdit.discardChanges')}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
