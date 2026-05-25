'use client'

import { useState } from 'react'
import { EyeOff, Maximize2, Monitor, RefreshCw, X } from 'lucide-react'

import { useEditPageContext } from '../_context/EditPageContext'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export const PreviewPanel = () => {
  const { previewState } = useEditPageContext()
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  return (
    <>
      <aside className="min-h-130 overflow-hidden rounded-md border bg-background xl:sticky xl:top-20 xl:h-[calc(100vh-15rem)]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Monitor className="size-4 shrink-0" />
              <span className="truncate text-sm font-medium">Preview</span>
              {previewState.isPreviewPending ? (
                <span className="text-muted-foreground text-xs">Updating</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    loading={previewState.isPreviewPending}
                    onClick={() => void previewState.handlePreview()}
                  >
                    <RefreshCw />
                    <span className="sr-only">Update preview</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Update preview</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!previewState.previewUrl}
                    onClick={() => setFullscreenOpen(true)}
                  >
                    <Maximize2 />
                    <span className="sr-only">Open large preview</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Open large preview</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => previewState.setPreviewOpen(false)}
                  >
                    <EyeOff />
                    <span className="sr-only">Close preview</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Close preview</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {previewState.previewError ? (
            <div className="border-b px-3 py-2 text-sm text-destructive">
              {previewState.previewError}
            </div>
          ) : null}
          {previewState.previewUrl ? (
            <iframe
              key={previewState.previewUrl}
              ref={previewState.previewFrameRef}
              allow="fullscreen"
              className="min-h-0 flex-1 border-0"
              src={previewState.previewUrl}
              tabIndex={-1}
              title="Preview"
            />
          ) : (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              Loading preview
            </div>
          )}
        </div>
      </aside>
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-sm">
              <Monitor className="size-4 shrink-0" />
              <span className="truncate">Preview</span>
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X />
                <span className="sr-only">Close large preview</span>
              </Button>
            </DialogClose>
          </div>
          {previewState.previewUrl ? (
            <iframe
              key={`fullscreen:${previewState.previewUrl}`}
              allow="fullscreen"
              className="min-h-0 flex-1 border-0"
              src={previewState.previewUrl}
              title="Preview fullscreen"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
