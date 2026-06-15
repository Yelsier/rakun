'use client'

import {
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  LayoutPanelTop,
  Monitor,
  NotepadText,
  RotateCcw,
  ScrollText,
  Trash,
} from 'lucide-react'

import { DocumentTranslationDialog } from './DocumentTranslationDialog'
import { useEditPageContext } from '../_context/EditPageContext'
import type { EditableDocumentVisibility } from '../edit.types'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  <span className='ml-1 rounded-sm bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none text-destructive'>
    Error
  </span>
)

export const EditToolbar = () => {
  const {
    canPreview,
    contentTypeId,
    documentActions,
    editableVisibility,
    handleVisibilityChange,
    hasVersioning,
    hasVisibility,
    isTrashed,
    openMoveToTrashDialog,
    openPermanentDeleteDialog,
    previewState,
    routeLayout,
    sections,
    showSaveErrorTooltip,
    tabErrors,
  } = useEditPageContext()
  const VisibilityIcon = visibilityIcons[editableVisibility]
  const pending = documentActions.pending
  const savePending = pending.create || pending.update || pending.delete || pending.trash
  const canSaveAsDraft = hasVisibility && contentTypeId && !isTrashed

  return (
    <div className='flex gap-2 justify-between items-center sticky top-0 bg-background z-50 pb-3 mb-3 border-b'>
      <div className='flex'>
        <TabsList variant='line' data-tour='content-edit-tabs'>
          {sections.hasNonIterables ? (
            <TabsTrigger value='info' className={cn(tabErrors.info && tabErrorClassName)}>
              <NotepadText />
              Info
              {tabErrors.info ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasIterables ? (
            <TabsTrigger value='content' className={cn(tabErrors.content && tabErrorClassName)}>
              <ScrollText />
              Content
              {tabErrors.content ? <TabErrorText /> : null}
            </TabsTrigger>
          ) : null}
          {sections.hasSeo ? (
            <TabsTrigger value='seo' className={cn(tabErrors.seo && tabErrorClassName)}>
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
          {hasVersioning && contentTypeId ? (
            <TabsTrigger value='versions'>
              <GitBranch />
              Versions
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>
      <div className='flex items-center gap-2'>
        {hasVisibility && isTrashed ? (
          <>
            <Button
              variant='outline'
              loading={pending.update}
              onClick={() => void documentActions.handleRestoreFromTrash()}
            >
              <RotateCcw />
              Restore from trash
            </Button>
            <Button
              variant='destructive'
              loading={pending.delete}
              onClick={openPermanentDeleteDialog}
            >
              <Trash />
              Delete permanently
            </Button>
          </>
        ) : hasVisibility ? (
          <div data-tour='content-edit-visibility'>
            <Select
              value={editableVisibility}
              onValueChange={(value) =>
                handleVisibilityChange(value as EditableDocumentVisibility)
              }
            >
              <SelectTrigger className={cn('w-36', visibilitySelectStyles[editableVisibility])}>
                <VisibilityIcon className='text-current' />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='hidden'>Hidden</SelectItem>
                <SelectItem value='published'>Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {contentTypeId && !isTrashed ? (
          <Button variant='destructive' loading={pending.trash} onClick={openMoveToTrashDialog}>
            <Trash />
            Move to trash
          </Button>
        ) : null}
        <DocumentTranslationDialog />
        {canPreview ? (
          <Button
            variant={previewState.previewOpen ? 'secondary' : 'outline'}
            loading={previewState.isPreviewPending}
            onClick={() => void previewState.handlePreview()}
          >
            <Monitor />
            Preview
          </Button>
        ) : null}
        {canSaveAsDraft ? (
          <div className='ml-auto inline-flex overflow-hidden rounded-md shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50'>
            <Tooltip open={showSaveErrorTooltip}>
              <TooltipTrigger asChild>
                <Button
                  loading={savePending}
                  className='cursor-pointer rounded-none shadow-none focus-visible:z-10 focus-visible:ring-0'
                  onClick={() => void documentActions.handleSave()}
                  data-tour='content-edit-save'
                >
                  Save
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top' sideOffset={8}>
                Hay errores por corregir
              </TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label='Save options'
                  disabled={savePending}
                  className='w-9 rounded-none border-l border-primary-foreground/25 px-0! shadow-none focus-visible:z-10 focus-visible:ring-0'
                >
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
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
                className='cursor-pointer ml-auto'
                onClick={() => void documentActions.handleSave()}
                data-tour='content-edit-save'
              >
                Save
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top' sideOffset={8}>
              Hay errores por corregir
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
