'use client'

import { Circle, RotateCcw, RotateCw, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../../../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog'
import { Input } from '../../../ui/input'
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
type DragMode = 'move' | 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se'
type ResizeMode = Exclude<DragMode, 'move'>

type DragState = {
  mode: DragMode
  pointerX: number
  pointerY: number
  crop: CropArea
}

type CropBounds = {
  width: number
  height: number
}

type MediaImageEditorDialogProps = {
  target: MediaRecord | null
  imageUrl: string
  isSaving: boolean
  onClose: () => void
  onSave: (file: File) => Promise<void>
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const MIN_CROP_SIZE = 5

const resizeHandles: Array<{
  mode: ResizeMode
  label: string
  className: string
  gripClassName: string
}> = [
  {
    mode: 'n',
    label: 'Resize top edge',
    className: 'left-1/2 top-0 h-7 w-20 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    gripClassName: 'h-2 w-14 rounded-full',
  },
  {
    mode: 's',
    label: 'Resize bottom edge',
    className: 'bottom-0 left-1/2 h-7 w-20 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    gripClassName: 'h-2 w-14 rounded-full',
  },
  {
    mode: 'w',
    label: 'Resize left edge',
    className: 'left-0 top-1/2 h-20 w-7 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    gripClassName: 'h-14 w-2 rounded-full',
  },
  {
    mode: 'e',
    label: 'Resize right edge',
    className: 'right-0 top-1/2 h-20 w-7 -translate-y-1/2 translate-x-1/2 cursor-ew-resize',
    gripClassName: 'h-14 w-2 rounded-full',
  },
  {
    mode: 'nw',
    label: 'Resize top left corner',
    className: 'left-0 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    gripClassName: 'h-4 w-4 rounded-sm',
  },
  {
    mode: 'ne',
    label: 'Resize top right corner',
    className: 'right-0 top-0 h-8 w-8 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize',
    gripClassName: 'h-4 w-4 rounded-sm',
  },
  {
    mode: 'sw',
    label: 'Resize bottom left corner',
    className: 'bottom-0 left-0 h-8 w-8 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    gripClassName: 'h-4 w-4 rounded-sm',
  },
  {
    mode: 'se',
    label: 'Resize bottom right corner',
    className: 'bottom-0 right-0 h-8 w-8 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    gripClassName: 'h-4 w-4 rounded-sm',
  },
]

const cropInputs: Array<{ key: keyof CropArea; label: string }> = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'width', label: 'W' },
  { key: 'height', label: 'H' },
]

const circleCropInputs: Array<{ key: keyof CropArea | 'diameter'; label: string }> = [
  { key: 'x', label: 'X' },
  { key: 'y', label: 'Y' },
  { key: 'diameter', label: 'D' },
]

const circleResizeHandles = resizeHandles.filter(({ mode }) =>
  ['n', 'e', 's', 'w'].includes(mode)
)

const normalizeCrop = (crop: CropArea): CropArea => {
  const width = clamp(crop.width, MIN_CROP_SIZE, 100)
  const height = clamp(crop.height, MIN_CROP_SIZE, 100)
  return {
    width,
    height,
    x: clamp(crop.x, 0, 100 - width),
    y: clamp(crop.y, 0, 100 - height),
  }
}

const cropToPixelRect = (crop: CropArea, bounds: CropBounds) => {
  const left = (crop.x / 100) * bounds.width
  const top = (crop.y / 100) * bounds.height
  const width = (crop.width / 100) * bounds.width
  const height = (crop.height / 100) * bounds.height

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  }
}

const minCircleDiameterFor = (bounds: CropBounds) =>
  (Math.min(bounds.width, bounds.height) * MIN_CROP_SIZE) / 100

const pixelCircleToCrop = ({
  left,
  top,
  diameter,
  bounds,
}: {
  left: number
  top: number
  diameter: number
  bounds: CropBounds
}): CropArea => {
  const minDiameter = minCircleDiameterFor(bounds)
  const nextDiameter = clamp(diameter, minDiameter, Math.min(bounds.width, bounds.height))
  const nextLeft = clamp(left, 0, bounds.width - nextDiameter)
  const nextTop = clamp(top, 0, bounds.height - nextDiameter)

  return {
    x: (nextLeft / bounds.width) * 100,
    y: (nextTop / bounds.height) * 100,
    width: (nextDiameter / bounds.width) * 100,
    height: (nextDiameter / bounds.height) * 100,
  }
}

const normalizeCircleCrop = (crop: CropArea, bounds: CropBounds): CropArea => {
  const rect = cropToPixelRect(crop, bounds)
  const diameter = Math.min(rect.width, rect.height)
  return pixelCircleToCrop({
    left: rect.left,
    top: rect.top,
    diameter,
    bounds,
  })
}

const cropToCenteredCircle = (crop: CropArea, bounds: CropBounds): CropArea => {
  const rect = cropToPixelRect(crop, bounds)
  const diameter = Math.min(rect.width, rect.height)
  return pixelCircleToCrop({
    left: rect.centerX - diameter / 2,
    top: rect.centerY - diameter / 2,
    diameter,
    bounds,
  })
}

const outputMimeFor = (mime: string, shape: CropShape) =>
  shape === 'circle'
    ? 'image/png'
    : mime === 'image/png' || mime === 'image/webp'
      ? mime
      : 'image/jpeg'

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
  bounds: CropBounds
  shape: CropShape
}): CropArea => {
  const dx = ((event.clientX - drag.pointerX) / bounds.width) * 100
  const dy = ((event.clientY - drag.pointerY) / bounds.height) * 100
  const dxPx = event.clientX - drag.pointerX
  const dyPx = event.clientY - drag.pointerY

  if (drag.mode === 'move') {
    const next = {
      ...drag.crop,
      x: drag.crop.x + dx,
      y: drag.crop.y + dy,
    }
    return shape === 'circle' ? normalizeCircleCrop(next, bounds) : normalizeCrop(next)
  }

  if (shape === 'circle') {
    const rect = cropToPixelRect(drag.crop, bounds)
    const minDiameter = minCircleDiameterFor(bounds)
    const maxCenteredWidth = 2 * Math.min(rect.centerX, bounds.width - rect.centerX)
    const maxCenteredHeight = 2 * Math.min(rect.centerY, bounds.height - rect.centerY)
    let left = rect.left
    let top = rect.top
    let diameter = rect.width

    if (drag.mode.includes('w')) {
      const right = rect.right
      diameter = clamp(right - (rect.left + dxPx), minDiameter, Math.min(right, maxCenteredHeight))
      left = right - diameter
      top = rect.centerY - diameter / 2
    } else if (drag.mode.includes('e')) {
      diameter = clamp(rect.width + dxPx, minDiameter, Math.min(bounds.width - left, maxCenteredHeight))
      top = rect.centerY - diameter / 2
    } else if (drag.mode.includes('n')) {
      const bottom = rect.bottom
      diameter = clamp(bottom - (rect.top + dyPx), minDiameter, Math.min(bottom, maxCenteredWidth))
      left = rect.centerX - diameter / 2
      top = bottom - diameter
    } else if (drag.mode.includes('s')) {
      diameter = clamp(rect.height + dyPx, minDiameter, Math.min(bounds.height - top, maxCenteredWidth))
      left = rect.centerX - diameter / 2
    }

    return pixelCircleToCrop({ left, top, diameter, bounds })
  }

  const next = { ...drag.crop }
  let left = drag.crop.x
  let top = drag.crop.y
  let right = drag.crop.x + drag.crop.width
  let bottom = drag.crop.y + drag.crop.height

  if (drag.mode.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP_SIZE)
  if (drag.mode.includes('e')) right = clamp(right + dx, left + MIN_CROP_SIZE, 100)
  if (drag.mode.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP_SIZE)
  if (drag.mode.includes('s')) bottom = clamp(bottom + dy, top + MIN_CROP_SIZE, 100)

  return normalizeCrop({
    ...next,
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  })
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

  const getCircleBounds = (): CropBounds | null => {
    const bounds = layerRef.current?.getBoundingClientRect()
    if (bounds?.width && bounds.height) return bounds
    if (image?.naturalWidth && image.naturalHeight) {
      return { width: image.naturalWidth, height: image.naturalHeight }
    }
    return null
  }

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

  const cropLabel = (() => {
    if (shape === 'circle') {
      const bounds = getCircleBounds()
      const diameter = bounds
        ? (cropToPixelRect(crop, bounds).width / Math.min(bounds.width, bounds.height)) * 100
        : Math.min(crop.width, crop.height)

      return `D ${Math.round(diameter)}% at ${Math.round(crop.x)}, ${Math.round(crop.y)}`
    }

    return `${Math.round(crop.width)}% x ${Math.round(crop.height)}% at ${Math.round(
      crop.x
    )}, ${Math.round(crop.y)}`
  })()

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
        const bounds = getCircleBounds()
        return bounds ? cropToCenteredCircle(prev, bounds) : normalizeCrop(prev)
      })
    }
  }

  const getCropInputValue = (key: keyof CropArea | 'diameter') => {
    if (key !== 'diameter') return Number(crop[key].toFixed(1))

    const bounds = getCircleBounds()
    if (!bounds) return Number(Math.min(crop.width, crop.height).toFixed(1))

    const diameter = (cropToPixelRect(crop, bounds).width / Math.min(bounds.width, bounds.height)) * 100
    return Number(diameter.toFixed(1))
  }

  const setCropValue = (key: keyof CropArea | 'diameter', value: number) => {
    if (Number.isNaN(value)) return
    setCrop((prev) => {
      if (shapeRef.current !== 'circle') {
        if (key === 'diameter') return prev
        return normalizeCrop({ ...prev, [key]: value })
      }

      const bounds = getCircleBounds()
      if (!bounds) return prev
      const rect = cropToPixelRect(prev, bounds)

      if (key === 'diameter' || key === 'width' || key === 'height') {
        const axisSize =
          key === 'height'
            ? bounds.height
            : key === 'width'
              ? bounds.width
              : Math.min(bounds.width, bounds.height)
        const diameter = (clamp(value, MIN_CROP_SIZE, 100) / 100) * axisSize

        return pixelCircleToCrop({
          left: rect.centerX - diameter / 2,
          top: rect.centerY - diameter / 2,
          diameter,
          bounds,
        })
      }

      return normalizeCircleCrop({ ...prev, [key]: value }, bounds)
    })
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
        side
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
        0.92
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
      <DialogContent className="max-h-[90vh] w-screen max-w-5xl! overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crop and rotate image</DialogTitle>
          <DialogDescription>
            Drag the crop area, resize from any edge, then save a copy.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="flex min-h-88 items-center justify-center overflow-hidden rounded-lg border bg-neutral-950 p-3">
            {isLoadingImage ? (
              <div className="text-sm text-muted-foreground">Loading image...</div>
            ) : objectUrl ? (
              <div className="relative inline-block max-h-[55vh] max-w-full select-none touch-none">
                <img
                  src={objectUrl}
                  alt={target?.alt || target?.name || ''}
                  className="block max-h-[55vh] max-w-full object-contain"
                  draggable={false}
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
                <div ref={layerRef} className="absolute inset-0">
                  <div
                    className={cn(
                      'absolute cursor-move border-2 border-white bg-transparent shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_0_0_9999px_rgba(0,0,0,0.48)]',
                      shape === 'circle' ? 'rounded-full' : 'rounded-none'
                    )}
                    style={{
                      left: `${crop.x}%`,
                      top: `${crop.y}%`,
                      width: `${crop.width}%`,
                      height: `${crop.height}%`,
                    }}
                    onPointerDown={(event) => startDrag('move', event)}
                  >
                    {(shape === 'circle' ? circleResizeHandles : resizeHandles).map((handle) => (
                      <button
                        key={handle.mode}
                        type="button"
                        aria-label={handle.label}
                        className={cn(
                          'absolute z-10 flex items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-white/80',
                          handle.className
                        )}
                        onPointerDown={(event) => startDrag(handle.mode, event)}
                      >
                        <span
                          className={cn(
                            'block bg-white shadow-sm ring-1 ring-neutral-950/15',
                            handle.gripClassName
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Image could not be loaded.</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Shape</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={shape === 'rectangle' ? 'default' : 'outline'}
                  onClick={() => setCropShape('rectangle')}
                >
                  <Square className="size-4" />
                  Rectangle
                </Button>
                <Button
                  type="button"
                  variant={shape === 'circle' ? 'default' : 'outline'}
                  onClick={() => setCropShape('circle')}
                >
                  <Circle className="size-4" />
                  Circle
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Rotation</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => setRotation((v) => v - 90)}>
                  <RotateCcw className="size-4" />
                  Left
                </Button>
                <Button type="button" variant="outline" onClick={() => setRotation((v) => v + 90)}>
                  <RotateCw className="size-4" />
                  Right
                </Button>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <Label>Crop area</Label>
              <p className="mt-1 text-xs text-muted-foreground">{cropLabel}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(shape === 'circle' ? circleCropInputs : cropInputs).map((input) => (
                  <div key={input.key} className="grid gap-1">
                    <Label htmlFor={`crop-${input.key}`} className="text-xs text-muted-foreground">
                      {input.label} %
                    </Label>
                    <Input
                      id={`crop-${input.key}`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={getCropInputValue(input.key)}
                      onChange={(event) =>
                        setCropValue(input.key, event.currentTarget.valueAsNumber)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSaving}
            disabled={!image || isLoadingImage}
            onClick={() => void handleSave()}
          >
            Save copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
