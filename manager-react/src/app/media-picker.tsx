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
      <DialogContent className="max-h-[95vh] w-screen max-w-[95vw]! overflow-hidden p-4">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Select existing media or upload new files.</DialogDescription>
        </DialogHeader>

        <MediaLibrary
          selectable
          isModal
          multipleSelect={isMultipleSelection}
          selectedMediaIds={selectedMediaIds}
          forcedMediaTypeFilter={forcedMediaTypeFilter}
          optimizeOptions={forcedOptimizeOptions}
          onSelect={select}
        />

        {isMultipleSelection ? (
          <DialogFooter>
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
