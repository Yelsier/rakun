'use client'

import type {
  EncodedContentType,
  IteratorItemVisibilityCondition,
} from '@rakun-kit/core/client'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { decodeCamelCase } from '@/helpers/decodeCamelCase'

type VisibilityMode = 'always' | IteratorItemVisibilityCondition['operator']

type IteratorVisibilityDialogProps = {
  condition?: IteratorItemVisibilityCondition
  contentType?: EncodedContentType
  moduleTitle: string
  onOpenChange: (open: boolean) => void
  onSave: (condition?: IteratorItemVisibilityCondition) => void
  open: boolean
}

export const IteratorVisibilityDialog = ({
  condition,
  contentType,
  moduleTitle,
  onOpenChange,
  onSave,
  open,
}: IteratorVisibilityDialogProps) => {
  const [mode, setMode] = useState<VisibilityMode>('always')
  const [field, setField] = useState('')

  const fields = useMemo(
    () =>
      Object.entries(contentType?.fields ?? {})
        .filter(
          ([name, config]) =>
            !name.startsWith('_') &&
            config.visibility === 'all' &&
            config.config.ui !== 'Iterator'
        )
        .map(([name]) => ({
          name,
          label: decodeCamelCase(name),
        })),
    [contentType]
  )

  useEffect(() => {
    if (!open) return

    setMode(condition?.operator ?? 'always')
    setField(condition?.field ?? '')
  }, [condition, open])

  const needsField = mode !== 'always'

  const handleSave = () => {
    onSave(
      mode === 'always'
        ? undefined
        : {
            field,
            operator: mode,
          }
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{moduleTitle} visibility</DialogTitle>
          <DialogDescription>
            Choose when this module should be rendered. The rule is shared, but it is evaluated
            using each {contentType?.name ?? 'document'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="iterator-visibility-mode">Visibility</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as VisibilityMode)}>
              <SelectTrigger id="iterator-visibility-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">Always visible</SelectItem>
                <SelectItem value="notEmpty">Visible when a field is not empty</SelectItem>
                <SelectItem value="empty">Visible when a field is empty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsField ? (
            <div className="space-y-2">
              <Label htmlFor="iterator-visibility-field">Document field</Label>
              {fields.length > 0 ? (
                <Select value={field} onValueChange={setField}>
                  <SelectTrigger id="iterator-visibility-field" className="w-full">
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((option) => (
                      <SelectItem key={option.name} value={option.name}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This content type has no fields available for visibility conditions.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={needsField && !field} onClick={handleSave}>
            Save visibility
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
