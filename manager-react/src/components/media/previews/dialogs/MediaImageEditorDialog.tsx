'use client'

import { Circle, RotateCcw, RotateCw, Square } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { Label } from '../../../ui/label'

import type { MediaRecord } from '@/lib/media'
import { cn } from '@/lib/utils'

type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

type CropShape = 'rectangle' | 'circle'
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

type DragState = {
  mode: DragMode
  pointerX: number
  pointerY: number
  crop: CropArea
}

type MediaImageEditorDialogProps = {
  target: MediaRecord | null
  imageUrl: string
  isSaving: boolean
  onClose: () => void
  onSave: (file: File) => Promise<void>
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

const normalizeCrop = (crop: CropArea): CropArea => {
  const width = clamp(crop.width, 5, 100)
  const height = clamp(crop.height, 5, 100)
  return {
    width,
    height,
    x: clamp(crop.x, 0, 100 - width),
    y: clamp(crop.y, 0, 100 - height),
  }
}

const outputMimeFor = (mime: string, shape: CropShape) =>
  shape === 'circle' ? 'image/png' : mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg'

const extensionFor = (mime: string) =>
  mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'

const getCropFromPointer = ({
  drag,
  event,
  bounds,
  shape,
}: {
  drag: DragState
  event: PointerEvent
  bounds: DOMRect
  shape: CropShape
}): CropArea => {
  const dx = ((event.clientX - drag.pointerX) / bounds.width) * 100
  const dy = ((event.clientY - drag.pointerY) / bounds.height) * 100

  if (drag.mode === 'move') {
    return normalizeCrop({
      ...drag.crop,
      x: drag.crop.x + dx,
      y: drag.crop.y + dy,
    })
  }

  const next = { ...drag.crop }
  if (drag.mode.includes('w')) {
    next.x = drag.crop.x + dx
    next.width = drag.crop.width - dx
  }
  if (drag.mode.includes('e')) {
    next.width = drag.crop.width + dx
  }
  if (drag.mode.includes('n')) {
    next.y = drag.crop.y + dy
    next.height = drag.crop.height - dy
  }
  if (drag.mode.includes('s')) {
    next.height = drag.crop.height + dy
  }

  if (shape === 'circle') {
    const side = Math.min(next.width, next.height)
    if (drag.mode.includes('w')) next.x = next.x + next.width - side
    if (drag.mode.includes('n')) next.y = next.y + next.height - side
    next.width = side
    next.height = side
  }

  return normalizeCrop(next)
}

export default function MediaImageEditorDialog({
  target,
  imageUrl,
  isSaving,
  onClose,
  onSave,
}: MediaImageEditorDialogProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const shapeRef = useRef<CropShape>('rectangle')
  const [objectUrl, setObjectUrl] = useState('')
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropArea>({
    x: 12,
    y: 12,
    width: 76,
    height: 76,
  })
  const [shape, setShape] = useState<CropShape>('rectangle')
  const [rotation, setRotation] = useState(0)
  const [isLoadingImage, setIsLoadingImage] = useState(false)

  useEffect(() => {
    shapeRef.current = shape
  }, [shape])

  useEffect(() => {
    if (!target || !imageUrl) return

    let cancelled = false
    let nextObjectUrl = ''
    setIsLoadingImage(true)
    setImage(null)
    setCrop({ x: 12, y: 12, width: 76, height: 76 })
    setShape('rectangle')
    setRotation(0)

    void (async () => {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      nextObjectUrl = URL.createObjectURL(blob)
      const nextImage = new Image()
      nextImage.src = nextObjectUrl
      await nextImage.decode()

      if (!cancelled) {
        setObjectUrl(nextObjectUrl)
        setImage(nextImage)
        setIsLoadingImage(false)
      }
    })().catch(() => {
      if (!cancelled) setIsLoadingImage(false)
    })

    return () => {
      cancelled = true
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl)
    }
  }, [target, imageUrl])

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const bounds = layerRef.current?.getBoundingClientRect()
      if (!drag || !bounds) return

      setCrop(getCropFromPointer({ drag, event, bounds, shape: shapeRef.current }))
    }

    const handlePointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const cropLabel = useMemo(
    () =>
      `${Math.round(crop.width)}% x ${Math.round(crop.height)}% at ${Math.round(
        crop.x,
      )}, ${Math.round(crop.y)}`,
    [crop],
  )

  const startDrag = (mode: DragMode, event: React.PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      crop,
    }
  }

  const setCropShape = (nextShape: CropShape) => {
    setShape(nextShape)
    if (nextShape === 'circle') {
      setCrop((prev) => {
        const side = Math.min(prev.width, prev.height)
        return normalizeCrop({
          ...prev,
          width: side,
          height: side,
        })
      })
    }
  }

  const handleSave = async () => {
    if (!target || !image) return

    const sourceWidth = image.naturalWidth
    const sourceHeight = image.naturalHeight
    const sx = Math.round((crop.x / 100) * sourceWidth)
    const sy = Math.round((crop.y / 100) * sourceHeight)
    const sw = Math.max(1, Math.round((crop.width / 100) * sourceWidth))
    const sh = Math.max(1, Math.round((crop.height / 100) * sourceHeight))
    const normalizedRotation = ((rotation % 360) + 360) % 360
    const rotatedSideways = normalizedRotation === 90 || normalizedRotation === 270
    const canvas = document.createElement('canvas')
    canvas.width = rotatedSideways ? sh : sw
    canvas.height = rotatedSideways ? sw : sh
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((normalizedRotation * Math.PI) / 180)
    ctx.drawImage(image, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh)

    if (shape === 'circle') {
      const maskCanvas = document.createElement('canvas')
      const side = Math.min(canvas.width, canvas.height)
      maskCanvas.width = side
      maskCanvas.height = side
      const maskCtx = maskCanvas.getContext('2d')
      if (!maskCtx) return

      maskCtx.save()
      maskCtx.beginPath()
      maskCtx.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2)
      maskCtx.clip()
      maskCtx.drawImage(
        canvas,
        (canvas.width - side) / 2,
        (canvas.height - side) / 2,
        side,
        side,
        0,
        0,
        side,
        side,
      )
      maskCtx.restore()
      canvas.width = side
      canvas.height = side
      ctx.clearRect(0, 0, side, side)
      ctx.drawImage(maskCanvas, 0, 0)
    }

    const mime = outputMimeFor(target.mime, shape)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('Could not export edited image'))
        },
        mime,
        0.92,
      )
    })
    const baseName = target.name.replace(/\.[^.]+$/, '')
    const file = new File([blob], `${baseName}-edited.${extensionFor(mime)}`, {
      type: mime,
    })

    await onSave(file)
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[90vh] w-screen max-w-5xl! overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Crop and rotate image</DialogTitle>
          <DialogDescription>Drag the crop area, resize from a corner, then save a copy.</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]'>
          <div className='flex min-h-[22rem] items-center justify-center overflow-hidden rounded-lg border bg-neutral-950 p-3'>
            {isLoadingImage ? (
              <div className='text-sm text-muted-foreground'>Loading image...</div>
            ) : objectUrl ? (
              <div className='relative inline-block max-h-[55vh] max-w-full select-none touch-none'>
                <img
                  src={objectUrl}
                  alt={target?.alt || target?.name || ''}
                  className='block max-h-[55vh] max-w-full object-contain'
                  draggable={false}
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
                <div ref={layerRef} className='absolute inset-0'>
                  <div
                    className={cn(
                      'absolute cursor-move border-2 border-dashed border-white bg-transparent',
                      shape === 'circle' ? 'rounded-full' : 'rounded-none',
                    )}
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                    }}
                    onPointerDown={(event) => startDrag('move', event)}
                  >
                    {(['nw', 'ne', 'sw', 'se'] as const).map((mode) => (
                      <button
                        key={mode}
                        type='button'
                        aria-label={`Resize ${mode}`}
                        className={cn(
                          'absolute h-5 w-5 bg-transparent',
                          mode.includes('n') ? '-top-2.5' : '-bottom-2.5',
                          mode.includes('w') ? '-left-2.5' : '-right-2.5',
                          mode === 'nw' || mode === 'se' ? 'cursor-nwse-resize' : 'cursor-nesw-resize',
                        )}
                        onPointerDown={(event) => startDrag(mode, event)}
                      >
                        <span
                          className={cn(
                            'absolute h-3 w-3 border-white',
                            mode.includes('n') ? 'top-1' : 'bottom-1',
                            mode.includes('w') ? 'left-1' : 'right-1',
                            mode === 'nw' && 'border-l-2 border-t-2',
                            mode === 'ne' && 'border-r-2 border-t-2',
                            mode === 'sw' && 'border-b-2 border-l-2',
                            mode === 'se' && 'border-b-2 border-r-2',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className='text-sm text-muted-foreground'>Image could not be loaded.</div>
            )}
          </div>

          <div className='space-y-4'>
            <div className='grid gap-2'>
              <Label>Shape</Label>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant={shape === 'rectangle' ? 'default' : 'outline'}
                  onClick={() => setCropShape('rectangle')}
                >
                  <Square className='size-4' />
                  Rectangle
                </Button>
                <Button
                  type='button'
                  variant={shape === 'circle' ? 'default' : 'outline'}
                  onClick={() => setCropShape('circle')}
                >
                  <Circle className='size-4' />
                  Circle
                </Button>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label>Rotation</Label>
              <div className='grid grid-cols-2 gap-2'>
                <Button type='button' variant='outline' onClick={() => setRotation((v) => v - 90)}>
                  <RotateCcw className='size-4' />
                  Left
                </Button>
                <Button type='button' variant='outline' onClick={() => setRotation((v) => v + 90)}>
                  <RotateCw className='size-4' />
                  Right
                </Button>
              </div>
            </div>

            <div className='rounded-md border p-3'>
              <Label>Crop area</Label>
              <p className='mt-1 text-xs text-muted-foreground'>{cropLabel}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type='button' variant='ghost' onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isSaving} disabled={!image || isLoadingImage} onClick={() => void handleSave()}>
            Save copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
