'use client'

import { Languages } from 'lucide-react'
import type { ReactNode } from 'react'

import { useEditPageContext } from '../_context/EditPageContext'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

export const DocumentTranslationDialog = ({
  trigger,
}: {
  trigger?: ReactNode | false
} = {}) => {
  const { documentActions, languageCode, languageList, translation, translationEnabled } =
    useEditPageContext()

  if (!translationEnabled) return null

  const { open, overwrite, source, targets } = translation
  const targetOptions = languageList.filter((item) => item.code !== source)
  const defaultTrigger = (
    <Button
      variant='outline'
      onClick={() => {
        translation.reset()
        translation.setSource(languageCode)
      }}
    >
      <Languages />
      Translate
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={translation.setOpen}>
      {trigger === false ? null : (
        <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Translate document</DialogTitle>
          <DialogDescription>Translate supported fields and save the document.</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-2'>
            <Label>Source language</Label>
            <Select
              value={source}
              onValueChange={(value) => {
                translation.setSource(value)
                translation.setTargets((currentTargets) =>
                  currentTargets.filter((target) => target !== value),
                )
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select source' />
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
          <div className='grid gap-2'>
            <Label>Target languages</Label>
            <div className='grid max-h-56 gap-2 overflow-auto rounded-md border p-3'>
              {targetOptions.map((item) => {
                const checked = targets.includes(item.code)

                return (
                  <label
                    key={item.code}
                    className='flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1'
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        translation.setTargets((currentTargets) =>
                          nextChecked
                            ? Array.from(new Set([...currentTargets, item.code]))
                            : currentTargets.filter((target) => target !== item.code),
                        )
                      }}
                    />
                    <span className='min-w-0 flex-1 truncate text-sm'>{item.name}</span>
                    <Badge variant='outline'>{item.code}</Badge>
                  </label>
                )
              })}
            </div>
          </div>
          <label className='flex cursor-pointer items-center gap-2'>
            <Checkbox
              checked={overwrite}
              onCheckedChange={(checked) => translation.setOverwrite(Boolean(checked))}
            />
            <span className='text-sm'>Overwrite existing translations</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => translation.setOpen(false)}>
            Cancel
          </Button>
          <Button
            loading={documentActions.pending.translate}
            disabled={targets.length === 0}
            onClick={() => {
              void (async () => {
                await documentActions.handleTranslateDocument({
                  from: source,
                  to: targets,
                  overwrite,
                })
                translation.setOpen(false)
              })()
            }}
          >
            Translate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
