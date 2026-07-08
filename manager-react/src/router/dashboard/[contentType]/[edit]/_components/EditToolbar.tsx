'use client'

import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  Languages,
  MapPinned,
  LayoutPanelTop,
  Monitor,
  MoreVertical,
  NotepadText,
  RotateCcw,
  ScrollText,
  Star,
  Trash,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { DocumentTranslationDialog } from './DocumentTranslationDialog'
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
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { cn } from '@/lib/utils'

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

const tabErrorClassName =
  '!text-destructive data-[state=active]:!text-destructive after:bg-destructive'

const TabErrorText = () => (
  <span className="ml-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-destructive">
    Error
  </span>
)

const FavoriteMenuItem = () => {
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
  const label = isFavorite ? 'Remove from favorites' : 'Add to favorites'

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
      toast.success(result.favorite ? 'Added to favorites' : 'Removed from favorites')
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not update favorite'))
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

export const EditToolbar = () => {
  const {
    canPreview,
    contentTypeId,
    documentActions,
    editableVisibility,
    handleVisibilityChange,
    hasVersioning,
    hasLocaleVariants,
    hasVisibility,
    isTrashed,
    languageCode,
    openMoveToTrashDialog,
    openPermanentDeleteDialog,
    previewState,
    routeLayout,
    sections,
    showSaveErrorTooltip,
    tabErrors,
    translation,
    translationEnabled,
  } = useEditPageContext()
  const VisibilityIcon = visibilityIcons[editableVisibility]
  const pending = documentActions.pending
  const savePending = pending.create || pending.update || pending.delete || pending.trash
  const canSaveAsDraft = hasVisibility && contentTypeId && !isTrashed
  const hasMoreActions = Boolean(contentTypeId) || canPreview || translationEnabled || isTrashed
  const hasPrimaryMenuActions =
    Boolean(contentTypeId && !isTrashed) || canPreview || translationEnabled

  const openTranslationDialog = () => {
    translation.reset()
    translation.setSource(languageCode)
    translation.setOpen(true)
  }

  return (
    <div className="flex gap-2 justify-between items-center sticky top-0 bg-background z-50 pb-3 mb-3 border-b">
      <div className="flex">
        <TabsList variant="line" data-tour="content-edit-tabs">
          {sections.hasNonIterables ? (
            <TabsTrigger value="info" className={cn(tabErrors.info && tabErrorClassName)}>
              <NotepadText />
              Info
              {tabErrors.info ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasIterables ? (
            <TabsTrigger value="content" className={cn(tabErrors.content && tabErrorClassName)}>
              <ScrollText />
              Content
              {tabErrors.content ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasSeo ? (
            <TabsTrigger value="seo" className={cn(tabErrors.seo && tabErrorClassName)}>
              <Globe />
              Seo
              {tabErrors.seo ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {routeLayout.routeLayoutModules.map((layoutModule) => (
            <TabsTrigger key={layoutModule._id} value={`layout:${layoutModule._id}`}>
              <LayoutPanelTop />
              {layoutModule.contentType}
            </TabsTrigger>
          ))}
          {hasLocaleVariants ? (
            <TabsTrigger value="locale-variants">
              <MapPinned />
              Locales
            </TabsTrigger>
          ) : null}
          {hasVersioning && contentTypeId ? (
            <TabsTrigger value="versions">
              <GitBranch />
              Versions
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>
      <div className="flex items-center gap-2">
        {hasVisibility && !isTrashed ? (
          <div data-tour="content-edit-visibility">
            <Select
              value={editableVisibility}
              onValueChange={(value) => handleVisibilityChange(value as EditableDocumentVisibility)}
            >
              <SelectTrigger className={cn('w-36', visibilitySelectStyles[editableVisibility])}>
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
        {canSaveAsDraft ? (
          <div
            className="ml-auto inline-flex overflow-hidden rounded-md shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50"
            data-tour="content-edit-save"
          >
            <Tooltip open={showSaveErrorTooltip}>
              <TooltipTrigger asChild>
                <Button
                  loading={savePending}
                  className="cursor-pointer rounded-none shadow-none focus-visible:z-10 focus-visible:ring-0"
                  onClick={() => void documentActions.handleSave()}
                >
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                Hay errores por corregir
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Save options"
                  disabled={savePending}
                  className="w-9 rounded-none border-l border-primary-foreground/25 px-0! shadow-none focus-visible:z-10 focus-visible:ring-0"
                >
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void documentActions.handleSaveAsDraft()}>
                  <Copy />
                  Save as draft
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Tooltip open={showSaveErrorTooltip}>
            <TooltipTrigger asChild>
              <Button
                loading={savePending}
                className="cursor-pointer ml-auto"
                onClick={() => void documentActions.handleSave()}
                data-tour="content-edit-save"
              >
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Hay errores por corregir
            </TooltipContent>
          </Tooltip>
        )}
        {hasMoreActions ? (
          <>
            <DocumentTranslationDialog trigger={false} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="More actions"
                  variant="outline"
                  size="icon"
                  data-tour="content-edit-actions"
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <FavoriteMenuItem />
                {translationEnabled ? (
                  <DropdownMenuItem disabled={pending.translate} onSelect={openTranslationDialog}>
                    <Languages />
                    Translate
                  </DropdownMenuItem>
                ) : null}
                {canPreview ? (
                  <DropdownMenuItem
                    disabled={previewState.isPreviewPending}
                    onSelect={() => void previewState.handlePreview()}
                  >
                    <Monitor />
                    {previewState.previewOpen ? 'Close preview' : 'Preview'}
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
                      Restore from trash
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending.delete}
                      variant="destructive"
                      onSelect={openPermanentDeleteDialog}
                    >
                      <Trash />
                      Delete permanently
                    </DropdownMenuItem>
                  </>
                ) : contentTypeId ? (
                  <DropdownMenuItem
                    disabled={pending.trash}
                    variant="destructive"
                    onSelect={openMoveToTrashDialog}
                  >
                    <Trash />
                    Move to trash
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>
    </div>
  )
}
