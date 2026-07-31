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
import { useTranslations } from '@/i18n'
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
  const t = useTranslations()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex h-[min(95svh,920px)] max-h-[95svh] w-screen max-w-[95vw]! flex-col gap-4 overflow-hidden p-4">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t('mediaPicker.title')}</DialogTitle>
          <DialogDescription>{t('mediaPicker.description')}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
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
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={confirmMultiple}>
              {t('mediaPicker.selectCount', { count: selectedMediaList.length })}
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
