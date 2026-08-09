'use client'

import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  GitBranch,
  Globe,
  Languages,
  MapPinned,
  LayoutPanelTop,
  LayoutTemplate,
  Monitor,
  MoreVertical,
  NotepadText,
  RotateCcw,
  ScrollText,
  Star,
  Trash,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { createManagerQueryKey, useManagerMutation, useManagerQuery } from '@/client/react'
import { getActionErrorMessage } from '@/helpers/get-action-error-message'
import { translateLayoutModuleLabel, useTranslations } from '@/i18n'
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

const tabsFadeVisibleClassName = 'opacity-100'

const TabsScrollArea = ({
  children,
  contentKey,
}: {
  children: ReactNode
  contentKey: string
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const leftFadeRef = useRef<HTMLDivElement>(null)
  const rightFadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    const content = contentRef.current
    const leftFade = leftFadeRef.current
    const rightFade = rightFadeRef.current
    if (!element || !content || !leftFade || !rightFade) return

    const updateOverflow = () => {
      const { clientWidth, scrollLeft, scrollWidth } = element
      const maxScrollLeft = scrollWidth - clientWidth

      leftFade.classList.toggle(tabsFadeVisibleClassName, scrollLeft > 1)
      rightFade.classList.toggle(
        tabsFadeVisibleClassName,
        maxScrollLeft > 1 && scrollLeft < maxScrollLeft - 1,
      )
    }

    updateOverflow()

    element.addEventListener('scroll', updateOverflow, { passive: true })
    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(element)
    resizeObserver.observe(content)
    window.addEventListener('resize', updateOverflow)

    return () => {
      element.removeEventListener('scroll', updateOverflow)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [contentKey])

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={scrollRef}
        className="min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div ref={contentRef} className="w-max min-w-full">
          {children}
        </div>
      </div>
      <div
        ref={leftFadeRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent opacity-0 transition-opacity duration-150"
      />
      <div
        ref={rightFadeRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity duration-150"
      />
    </div>
  )
}

const TabErrorText = () => {
  const t = useTranslations()
  return (
    <span className="ml-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-destructive">
      {t('common.error')}
    </span>
  )
}

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
  const label = isFavorite
    ? t('common.removeFromFavorites')
    : t('common.addToFavorites')

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
      toast.success(
        result.favorite
          ? t('common.addedToFavorites')
          : t('dashboard.removedFavorite'),
      )
    } catch (error) {
      toast.error(
        getActionErrorMessage(error, t('common.couldNotUpdateFavorite')),
      )
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
  const t = useTranslations()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const {
    canPreview,
    contentType,
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
    publicUrl,
    routeLayout,
    sections,
    showSaveErrorTooltip,
    tabErrors,
    template,
    translation,
    translationEnabled,
  } = useEditPageContext()
  const VisibilityIcon = visibilityIcons[editableVisibility]
  const pending = documentActions.pending
  const savePending =
    pending.create ||
    pending.update ||
    pending.delete ||
    pending.trash ||
    pending.version ||
    pending.promote ||
    template.pending
  const canSaveAsDraft = hasVisibility && contentTypeId && !isTrashed
  const commentsEnabled = Boolean(contentTypeId)
  const hasMoreActions = Boolean(contentTypeId) || canPreview || translationEnabled || isTrashed
  const hasPrimaryMenuActions =
    Boolean(contentTypeId && !isTrashed) || canPreview || translationEnabled

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setCommentsOpen(
      search.get('comments') === 'open' || search.get('review') === 'open',
    )
  }, [contentTypeId])

  const openTranslationDialog = () => {
    translation.reset()
    translation.setSource(languageCode)
    translation.setOpen(true)
  }

  return (
    <div className="sticky top-0 z-50 mb-3 flex flex-col gap-2 border-b bg-background pb-3 md:flex-row md:items-center md:justify-between md:gap-2">
      <TabsScrollArea
        contentKey={[
          sections.hasNonIterables,
          sections.hasIterables,
          sections.hasSeo,
          template.enabled,
          hasLocaleVariants,
          hasVersioning,
          contentTypeId,
          routeLayout.routeLayoutModules.map((module) => module._id).join(','),
        ].join(':')}
      >
        <TabsList variant="line" data-tour="content-edit-tabs">
          {sections.hasNonIterables ? (
            <TabsTrigger value="info" className={cn(tabErrors.info && tabErrorClassName)}>
              <NotepadText />
              {t('contentEdit.tabInfo')}
              {tabErrors.info ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasIterables ? (
            <TabsTrigger value="content" className={cn(tabErrors.content && tabErrorClassName)}>
              <ScrollText />
              {t('contentEdit.tabContent')}
              {tabErrors.content ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {template.enabled ? (
            <TabsTrigger
              value="template"
              className={cn(tabErrors.template && tabErrorClassName)}
            >
              <LayoutTemplate />
              {t('contentEdit.tabTemplate')}
              {tabErrors.template ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasSeo ? (
            <TabsTrigger value="seo" className={cn(tabErrors.seo && tabErrorClassName)}>
              <Globe />
              {t('contentEdit.tabSeo')}
              {tabErrors.seo ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {routeLayout.routeLayoutModules.map((layoutModule) => (
            <TabsTrigger key={layoutModule._id} value={`layout:${layoutModule._id}`}>
              <LayoutPanelTop />
              {translateLayoutModuleLabel(
                t,
                layoutModule.key,
                layoutModule.contentType,
              )}
            </TabsTrigger>
          ))}
          {hasLocaleVariants ? (
            <TabsTrigger value="variants">
              <MapPinned />
              {t('contentEdit.tabVariants')}
            </TabsTrigger>
          ) : null}
          {hasVersioning && contentTypeId ? (
            <TabsTrigger value="history">
              <GitBranch />
              {t('contentEdit.tabHistory')}
            </TabsTrigger>
          ) : null}
        </TabsList>
      </TabsScrollArea>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
        {canSaveAsDraft ? (
          <div
            className="inline-flex overflow-hidden rounded-md shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50"
            data-tour="content-edit-save"
          >
            <Tooltip open={showSaveErrorTooltip}>
              <TooltipTrigger asChild>
                <Button
                  loading={savePending}
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
                  disabled={savePending}
                  className="w-9 rounded-none border-l border-primary-foreground/25 px-0! shadow-none focus-visible:z-10 focus-visible:ring-0"
                >
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void documentActions.handleSaveAsDraft()}>
                  <Copy />
                  {t('contentEdit.saveAsDraft')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Tooltip open={showSaveErrorTooltip}>
            <TooltipTrigger asChild>
              <Button
                loading={savePending}
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
              <DropdownMenuContent align="end" className="min-w-52">
                <FavoriteMenuItem />
                {translationEnabled ? (
                  <DropdownMenuItem disabled={pending.translate} onSelect={openTranslationDialog}>
                    <Languages />
                    {t('contentList.translate')}
                  </DropdownMenuItem>
                ) : null}
                {canPreview ? (
                  <DropdownMenuItem
                    disabled={!previewState.previewOpen && previewState.isPreviewPending}
                    onSelect={() => {
                      if (previewState.previewOpen) {
                        previewState.setPreviewOpen(false)
                        return
                      }

                      void previewState.handlePreview()
                    }}
                  >
                    <Monitor />
                    {previewState.previewOpen
                      ? t('contentEdit.closePreview')
                      : t('common.preview')}
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
    </div>
  )
}
