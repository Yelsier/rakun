'use client'

import MediaLibrary from '@/components/media/MediaLibrary'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ManagerMediaPickerRenderArgs } from '@/media'

function DefaultManagerMediaPicker({
  isOpen,
  selectedMediaIds,
  forcedMediaTypeFilter,
  forcedOptimizeOptions,
  isMultipleSelection,
  selectedMediaList,
  close,
  select,
  confirmMultiple,
}: ManagerMediaPickerRenderArgs) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[95svh] w-screen max-w-[95vw]! flex-col gap-4 overflow-hidden p-4">
        <DialogHeader className="shrink-0">
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Select existing media or upload new files.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <MediaLibrary
            selectable
            isModal
            multipleSelect={isMultipleSelection}
            selectedMediaIds={selectedMediaIds}
            forcedMediaTypeFilter={forcedMediaTypeFilter}
            optimizeOptions={forcedOptimizeOptions}
            onSelect={select}
          />
        </div>

        {isMultipleSelection ? (
          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmMultiple}>
              Select {selectedMediaList.length}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export const renderDefaultManagerMediaPicker = (args: ManagerMediaPickerRenderArgs) => (
  <DefaultManagerMediaPicker {...args} />
)
