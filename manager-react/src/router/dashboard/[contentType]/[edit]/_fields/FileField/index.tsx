'use client'

import { GripVertical, ImagePlus, Settings2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Image as RakunImage } from '@rakun-kit/react'

import { useTranslations } from '@/i18n'
import type { EncodedFileField } from '@rakun-kit/core/client'
import type { TranslatableValue } from '@rakun-kit/core/types'

import { FieldRef } from '../../ContentTypeEdit'
import { FieldWrapper } from '../shared/FieldWrapper'
import { ItemLimitStatus } from '../shared/ItemLimitStatus'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTRPC, useTRPCClient } from '@/components/trpc-provider'
import { useEditErrorStore } from '@/hooks/app-store'
import type { MediaRecord } from '@/lib/media'
import { formatFileSize } from '@/components/media/previews/utils/mediaPreview'
import { getMediaDisplaySource } from '@/components/media/previews/hooks/useMediaPreviewRenderer'
import { useMedia } from '@/lib/providers/media/MediaClientProvider'
import { useLanguage } from '@/lib/providers/language/LanguageClientProvider'

type FileFieldProps = EncodedFileField & {
  id: string
  defaultData?: unknown
  ref: React.Ref<FieldRef>
}

type MediaRelationValue = {
  type: 'existing'
  _id: string
  contentType: 'Media'
}

type MediaRelationTranslatableValue = TranslatableValue<MediaRelationValue | null>
type MediaRelationArrayTranslatableValue = TranslatableValue<MediaRelationValue[] | null>

type MediaPreviewListItem = Pick<MediaRecord, '_id' | 'name'> &
  Partial<
    Pick<
      MediaRecord,
      | 'access'
      | 'alt'
      | 'height'
      | 'key'
      | 'mime'
      | 'previewKey'
      | 'previewUrl'
      | 'size'
      | 'sizes'
      | 'title'
      | 'url'
      | 'width'
    >
  >

const INLINE_MEDIA_LIMIT = 5

const isMediaRelation = (value: unknown): value is MediaRelationValue => {
  return (
    !!value &&
    typeof value === 'object' &&
    'type' in value &&
    value.type === 'existing' &&
    '_id' in value &&
    typeof value._id === 'string' &&
    'contentType' in value &&
    value.contentType === 'Media'
  )
}

const isTranslatableMediaRelation = (value: unknown): value is MediaRelationTranslatableValue => {
  return !!value && typeof value === 'object' && '_tag' in value && value._tag === 'Translatable'
}

const isMediaRelationArray = (value: unknown): value is MediaRelationValue[] => {
  return Array.isArray(value) && value.every((item) => isMediaRelation(item))
}

const isTranslatableMediaRelationArray = (
  value: unknown
): value is MediaRelationArrayTranslatableValue => {
  return !!value && typeof value === 'object' && '_tag' in value && value._tag === 'Translatable'
}

const isValidType = (mediaType: EncodedFileField['mediaType'], mime: string): boolean => {
  const normalized = mediaType.toLowerCase()
  if (normalized === 'any') return true
  if (normalized === 'image') return mime.startsWith('image/')
  if (normalized === 'video') return mime.startsWith('video/')
  if (normalized === 'document') {
    return mime.startsWith('application/') || mime.startsWith('text/')
  }
  return true
}

const SelectedMediaListItem = ({
  media,
  onDelete,
  reorderable = true,
  layout = 'list',
}: {
  media: MediaPreviewListItem
  onDelete: (id: string) => void
  reorderable?: boolean
  layout?: 'list' | 'grid'
}) => {
  const t = useTranslations()
  const trpcClient = useTRPCClient()
  const display = getMediaDisplaySource(media)
  const canResolveImage =
    Boolean(media.mime?.startsWith('image/')) &&
    Boolean(
      media.access &&
        (display.src || display.key || media.sizes?.some((size) => size.url)),
    )
  const { data: resolvedUrl } = useQuery({
    queryKey: [
      'file-field-media-list-display-url',
      media._id,
      display.key,
      media.access,
      display.src,
      media.sizes?.map((size) => size.url || size.key).join('|'),
    ],
    enabled: canResolveImage && !display.src && !media.sizes?.some((size) => size.url),
    queryFn: async () => {
      if (!display.key || !media.access) return ''

      const result = (await trpcClient.manager.media.getUrl.query({
        key: display.key,
        access: media.access,
      })) as { url: string }

      return result.url
    },
  })

  const imageSrc = display.src || resolvedUrl || undefined
  const showImage =
    Boolean(media.mime?.startsWith('image/')) &&
    Boolean(imageSrc || media.sizes?.some((size) => size.url))

  const image = showImage ? (
    <RakunImage
      image={{
        key: display.key,
        access: media.access,
        url: imageSrc,
        previewUrl: media.previewUrl?.startsWith('data:')
          ? media.previewUrl
          : undefined,
        name: media.name,
        title: media.title,
        alt: media.alt,
        width: media.width,
        height: media.height,
        sizes: media.sizes,
      }}
      sizes={layout === 'grid' ? '200px' : '48px'}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  ) : null

  const metadata = [
    typeof media.size === 'number' ? formatFileSize(media.size) : null,
    media.mime || null,
  ]
    .filter(Boolean)
    .join(' • ')

  if (layout === 'grid') {
    return (
      <div className="group relative min-w-0 overflow-hidden rounded-lg border bg-background">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {image ?? (
            <div className="flex size-full items-center justify-center">
              <ImagePlus className="text-muted-foreground size-7" />
            </div>
          )}
          {reorderable ? (
            <SortableItemHandle asChild>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-2 left-2 size-8 cursor-grab shadow-sm active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
                <span className="sr-only">{t('contentEdit.reorderMedia')}</span>
              </Button>
            </SortableItemHandle>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="text-destructive hover:text-destructive absolute top-2 right-2 size-8 shadow-sm"
            onClick={() => onDelete(media._id)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">{t('contentEdit.removeMedia')}</span>
          </Button>
        </div>
        <div className="min-w-0 p-2.5">
          <p className="truncate text-sm font-medium">{media.name || media._id}</p>
          {metadata ? <p className="text-muted-foreground truncate text-xs">{metadata}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border bg-background p-2">
      {reorderable ? (
        <SortableItemHandle asChild>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0">
            <GripVertical className="size-4" />
            <span className="sr-only">{t('contentEdit.reorderMedia')}</span>
          </Button>
        </SortableItemHandle>
      ) : null}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {image ?? <ImagePlus className="text-muted-foreground size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{media.name || media._id}</p>
        {metadata ? <p className="text-muted-foreground truncate text-xs">{metadata}</p> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive size-8 shrink-0"
        onClick={() => onDelete(media._id)}
      >
        <Trash2 className="size-4" />
        <span className="sr-only">{t('contentEdit.removeMedia')}</span>
      </Button>
    </div>
  )
}

const FileField: React.FC<FileFieldProps> = ({ ref, ...props }) => {
  const t = useTranslations()
  const { language } = useLanguage()
  const { openMediaLibrary } = useMedia()
  const trpc = useTRPC()
  const trpcClient = useTRPCClient()
  const addError = useEditErrorStore((state) => state.addError)
  const removeRelatedErrors = useEditErrorStore((state) => state.removeRelatedErrors)
  const error = useEditErrorStore(
    (state) => state.errors.find((item) => item.id === props.id)?.error
  )
  const [selectedMedia, setSelectedMedia] = useState<MediaRecord | null>(null)
  const [selectedMediaList, setSelectedMediaList] = useState<MediaRecord[]>([])
  const [manageMediaOpen, setManageMediaOpen] = useState(false)
  const [translations, setTranslations] = useState<MediaRelationTranslatableValue>(() =>
    props.isTranslatable && !props.isMultiple && isTranslatableMediaRelation(props.defaultData)
      ? props.defaultData
      : ({ _tag: 'Translatable' } as MediaRelationTranslatableValue)
  )
  const [translationsList, setTranslationsList] = useState<MediaRelationArrayTranslatableValue>(
    () =>
      props.isTranslatable &&
      props.isMultiple &&
      isTranslatableMediaRelationArray(props.defaultData)
        ? props.defaultData
        : ({ _tag: 'Translatable' } as MediaRelationArrayTranslatableValue)
  )
  const [value, setValue] = useState<MediaRelationValue | null>(() =>
    props.isTranslatable && !props.isMultiple && isTranslatableMediaRelation(props.defaultData)
      ? (() => {
          const translated = props.defaultData[language.code]
          return isMediaRelation(translated) ? translated : null
        })()
      : !props.isMultiple && isMediaRelation(props.defaultData)
        ? props.defaultData
        : null
  )
  const [valueList, setValueList] = useState<MediaRelationValue[]>(() =>
    props.isTranslatable && props.isMultiple && isTranslatableMediaRelationArray(props.defaultData)
      ? (() => {
          const translated = props.defaultData[language.code]
          return isMediaRelationArray(translated) ? translated : []
        })()
      : !props.isTranslatable && props.isMultiple && isMediaRelationArray(props.defaultData)
        ? props.defaultData
        : []
  )

  useEffect(() => {
    if (!props.isTranslatable || props.isMultiple) return
    const translated = translations[language.code]
    setValue(isMediaRelation(translated) ? translated : null)
  }, [language.code, props.isMultiple, props.isTranslatable, translations])

  useEffect(() => {
    if (!props.isTranslatable || !props.isMultiple) return
    const translated = translationsList[language.code]
    setValueList(isMediaRelationArray(translated) ? translated : [])
  }, [language.code, props.isMultiple, props.isTranslatable, translationsList])

  const { data: defaultMedia } = useQuery({
    ...trpc.manager.get.queryOptions({
      contentType: 'Media',
      id: value?._id || '',
    }),
    enabled: !!value?._id && !selectedMedia,
  })
  const { data: defaultMediaListRaw } = useQuery({
    ...trpc.manager.list.queryOptions({
      contentType: 'Media',
      query: {
        filter: {
          _id: {
            $in: valueList.map((item) => item._id),
          },
        },
        options: { limit: 'all' },
      } as never,
    }),
    enabled: props.isMultiple && valueList.length > 0,
  })

  const defaultMediaListData = defaultMediaListRaw as { items?: MediaRecord[] } | undefined
  const defaultMediaList = useMemo(() => {
    const mediaById = new Map(
      ((defaultMediaListData?.items ?? []) as MediaRecord[])
        .filter(Boolean)
        .map((item) => [item._id, item])
    )

    return valueList.flatMap((relation) => {
      const media = mediaById.get(relation._id)
      return media ? [media] : []
    })
  }, [defaultMediaListData?.items, valueList])

  const mediaForPreview = (selectedMedia ??
    (defaultMedia as MediaRecord | undefined) ??
    null) as MediaRecord | null
  const mediaListForPreview = useMemo(() => {
    const mediaById = new Map(defaultMediaList.map((item) => [item._id, item]))

    for (const media of selectedMediaList) {
      mediaById.set(media._id, media)
    }

    return valueList.flatMap((relation) => {
      const media = mediaById.get(relation._id)
      return media ? [media] : []
    })
  }, [defaultMediaList, selectedMediaList, valueList])
  const selectedMediaItems = useMemo(() => {
    const mediaById = new Map(mediaListForPreview.map((item) => [item._id, item]))

    return valueList.map(
      (relation): MediaPreviewListItem =>
        mediaById.get(relation._id) ?? {
          _id: relation._id,
          name: relation._id,
        }
    )
  }, [mediaListForPreview, valueList])
  const inlineMediaItems = selectedMediaItems.slice(0, INLINE_MEDIA_LIMIT)
  const hasMoreMedia = selectedMediaItems.length > INLINE_MEDIA_LIMIT

  const { data: singleImageUrl } = useQuery({
    queryKey: [
      'file-field-media-display-url',
      mediaForPreview?._id,
      mediaForPreview?.key,
      mediaForPreview?.previewKey,
      mediaForPreview?.access,
      mediaForPreview?.url,
      mediaForPreview?.previewUrl,
      mediaForPreview?.sizes?.map((size) => size.url || size.key).join('|'),
    ],
    enabled:
      !!mediaForPreview &&
      mediaForPreview.mime.startsWith('image/') &&
      !getMediaDisplaySource(mediaForPreview).src &&
      !mediaForPreview.sizes?.some((size) => size.url),
    queryFn: async () => {
      if (!mediaForPreview) return ''
      const display = getMediaDisplaySource(mediaForPreview)
      if (!display.key) return ''
      const result = (await trpcClient.manager.media.getUrl.query({
        key: display.key,
        access: mediaForPreview.access,
      })) as { url: string }
      return result.url
    },
  })
  const singleDisplay = mediaForPreview
    ? getMediaDisplaySource(mediaForPreview)
    : { src: undefined, key: undefined }
  const singleImageSrc = singleDisplay.src || singleImageUrl || undefined
  const showSingleImage =
    !!mediaForPreview?.mime?.startsWith('image/') &&
    Boolean(singleImageSrc || mediaForPreview.sizes?.some((size) => size.url))

  const getValue = () => {
    if (props.isMultiple) {
      if (props.minItems !== undefined && valueList.length < props.minItems) {
        const _error = t('contentEdit.minimumItemsError', {
          count: props.minItems,
        })
        addError(props.id, _error)
        return { _error }
      }
      if (props.maxItems !== undefined && valueList.length > props.maxItems) {
        const _error = t('contentEdit.maximumItemsError', {
          count: props.maxItems,
        })
        addError(props.id, _error)
        return { _error }
      }

      if (props.isTranslatable) {
        const normalized = {
          ...translationsList,
          [language.code]: valueList,
          _tag: 'Translatable' as const,
        }
        const hasAnyValue = Object.entries(normalized).some(
          ([lang, relationValue]) =>
            lang !== '_tag' && Array.isArray(relationValue) && relationValue.length > 0
        )

        if (props.isRequired && !hasAnyValue) {
          const _error = 'This field is required'
          addError(props.id, _error)
          return { _error }
        }

        if (!hasAnyValue) {
          return null
        }

        return normalized
      }

      if (props.isRequired && valueList.length === 0) {
        const _error = 'This field is required'
        addError(props.id, _error)
        return { _error }
      }

      return valueList.length === 0 ? null : valueList
    }

    if (props.isTranslatable) {
      const normalized = {
        ...translations,
        [language.code]: value,
        _tag: 'Translatable' as const,
      }
      const hasAnyValue = Object.entries(normalized).some(
        ([lang, relationValue]) => lang !== '_tag' && isMediaRelation(relationValue)
      )

      if (props.isRequired && !hasAnyValue) {
        const _error = 'This field is required'
        addError(props.id, _error)
        return { _error }
      }

      if (!hasAnyValue) {
        return null
      }

      return normalized
    }

    if (props.isRequired && !value) {
      const _error = 'This field is required'
      addError(props.id, _error)
      return { _error }
    }

    return value
  }

  const getState = () => {
    if (props.isMultiple) {
      return props.isTranslatable ? translationsList : valueList
    }
    return props.isTranslatable ? translations : value
  }

  const preview = useMemo(() => {
    if (!props.isMultiple && mediaForPreview) {
      return {
        name: mediaForPreview.name,
        mime: mediaForPreview.mime,
      }
    }
    if (
      !props.isMultiple &&
      isMediaRelation(props.defaultData) &&
      value?._id === props.defaultData._id
    ) {
      return {
        name: props.defaultData._id,
        mime: 'Media',
      }
    }
    return null
  }, [mediaForPreview, props.defaultData, props.isMultiple, value?._id])

  const handleMultipleSort = useCallback(
    (items: MediaPreviewListItem[]) => {
      const orderedIds = items.map((item) => item._id)
      const relationById = new Map(valueList.map((relation) => [relation._id, relation]))
      const mediaById = new Map(mediaListForPreview.map((media) => [media._id, media]))
      const relationList = orderedIds.flatMap((id) => {
        const relation = relationById.get(id)
        return relation ? [relation] : []
      })
      const mediaList = orderedIds.flatMap((id) => {
        const media = mediaById.get(id)
        return media ? [media] : []
      })

      setValueList(relationList)
      setSelectedMediaList(mediaList)

      if (props.isTranslatable) {
        setTranslationsList((prev) => ({
          ...prev,
          [language.code]: relationList,
        }))
      }
    },
    [language.code, mediaListForPreview, props.isTranslatable, valueList]
  )

  const handleMultipleDelete = useCallback(
    (mediaId: string) => {
      removeRelatedErrors(props.id)

      const relationList = valueList.filter((relation) => relation._id !== mediaId)
      const mediaList = mediaListForPreview.filter((media) => media._id !== mediaId)

      setValueList(relationList)
      setSelectedMediaList(mediaList)

      if (props.isTranslatable) {
        setTranslationsList((prev) => ({
          ...prev,
          [language.code]: relationList,
        }))
      }
    },
    [
      language.code,
      mediaListForPreview,
      props.id,
      props.isTranslatable,
      removeRelatedErrors,
      valueList,
    ]
  )

  const onSelectMedia = useCallback(async () => {
    const mediaOrList = await openMediaLibrary({
      mediaType: props.mediaType,
      optimizeOptions: props.uploadMethod === 'optimize' ? props.optimizeOptions : undefined,
      multiple: props.isMultiple,
      initialSelectedMedia: props.isMultiple ? mediaListForPreview : undefined,
    })
    if (!mediaOrList) return

    if (props.isMultiple) {
      const mediaList = (Array.isArray(mediaOrList) ? mediaOrList : [mediaOrList]).filter((item) =>
        isValidType(props.mediaType, item.mime)
      )

      if (mediaList.length === 0) {
        toast.error(t('contentEdit.invalidMediaFiles', { mediaType: props.mediaType }))
        return
      }
      if (props.maxItems !== undefined && mediaList.length > props.maxItems) {
        toast.error(
          t('contentEdit.maximumItemsError', { count: props.maxItems }),
        )
        return
      }

      removeRelatedErrors(props.id)
      setSelectedMediaList(mediaList)
      const relationList: MediaRelationValue[] = mediaList.map((media) => ({
        type: 'existing',
        _id: media._id,
        contentType: 'Media',
      }))
      setValueList(relationList)
      if (props.isTranslatable) {
        setTranslationsList((prev) => ({
          ...prev,
          [language.code]: relationList,
        }))
      }
      return
    }

    const media = mediaOrList as MediaRecord

    if (!isValidType(props.mediaType, media.mime)) {
      toast.error(t('contentEdit.invalidMediaFile', { mediaType: props.mediaType }))
      return
    }

    removeRelatedErrors(props.id)
    setSelectedMedia(media)
    const relationValue: MediaRelationValue = {
      type: 'existing',
      _id: media._id,
      contentType: 'Media',
    }
    setValue(relationValue)
    if (props.isTranslatable) {
      setTranslations((prev) => ({
        ...prev,
        [language.code]: relationValue,
      }))
    }
  }, [
    removeRelatedErrors,
    language.code,
    openMediaLibrary,
    props.isTranslatable,
    props.isMultiple,
    props.mediaType,
    mediaListForPreview,
    props.optimizeOptions,
    props.uploadMethod,
  ])

  return (
    <FieldWrapper
      id={props.id}
      errors={error ? [{ id: props.id, error }] : []}
      getValue={getValue}
      getState={getState}
      ref={ref}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onSelectMedia}>
            <ImagePlus className="size-4" />
            {props.isMultiple ? 'Select media files' : 'Select media'}
          </Button>
          {props.isMultiple ? (
            valueList.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  removeRelatedErrors(props.id)
                  setSelectedMediaList([])
                  setValueList([])
                  if (props.isTranslatable) {
                    setTranslationsList((prev) => ({
                      ...prev,
                      [language.code]: [],
                    }))
                  }
                }}
              >
                <Trash2 className="size-4" />
                {t('common.clear')}
              </Button>
            ) : null
          ) : value ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                removeRelatedErrors(props.id)
                setSelectedMedia(null)
                setValue(null)
                if (props.isTranslatable) {
                  setTranslations((prev) => ({
                    ...prev,
                    [language.code]: null,
                  }))
                }
              }}
            >
              <Trash2 className="size-4" />
              {t('common.clear')}
            </Button>
          ) : null}
        </div>
        {props.isMultiple ? (
          <ItemLimitStatus
            count={valueList.length}
            minItems={props.minItems}
            maxItems={props.maxItems}
          />
        ) : null}
        {props.isMultiple ? (
          valueList.length > 0 ? (
            <Card className="p-3 text-sm">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{t('contentEdit.mediaSelected', { count: valueList.length })}</p>
                    {hasMoreMedia ? (
                      <p className="text-muted-foreground text-xs">
                        {t('contentEdit.showingFirst', { count: INLINE_MEDIA_LIMIT })}
                      </p>
                    ) : null}
                  </div>
                  {hasMoreMedia ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManageMediaOpen(true)}
                    >
                      <Settings2 className="size-4" />
                      {t('contentEdit.manageAndReorder')}
                    </Button>
                  ) : null}
                </div>
                {hasMoreMedia ? (
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">
                    {inlineMediaItems.map((media) => (
                      <SelectedMediaListItem
                        key={media._id}
                        media={media}
                        onDelete={handleMultipleDelete}
                        reorderable={false}
                        layout="grid"
                      />
                    ))}
                  </div>
                ) : (
                  <Sortable
                    value={inlineMediaItems}
                    onValueChange={handleMultipleSort}
                    getItemValue={(item) => item._id}
                    orientation="mixed"
                  >
                    <SortableContent className="grid grid-cols-3 gap-2 lg:grid-cols-5">
                      {inlineMediaItems.map((media) => (
                        <SortableItem key={media._id} value={media._id} asChild>
                          <div>
                            <SelectedMediaListItem
                              media={media}
                              onDelete={handleMultipleDelete}
                              layout="grid"
                            />
                          </div>
                        </SortableItem>
                      ))}
                    </SortableContent>
                  </Sortable>
                )}
              </div>
            </Card>
          ) : null
        ) : value ? (
          <Card className="p-3 text-sm">
            <div className="flex items-center gap-3">
              {showSingleImage && mediaForPreview ? (
                <RakunImage
                  image={{
                    key: singleDisplay.key,
                    access: mediaForPreview.access,
                    url: singleImageSrc,
                    previewUrl: mediaForPreview.previewUrl?.startsWith('data:')
                      ? mediaForPreview.previewUrl
                      : undefined,
                    name: mediaForPreview.name,
                    title: mediaForPreview.title,
                    alt: mediaForPreview.alt,
                    width: mediaForPreview.width,
                    height: mediaForPreview.height,
                    sizes: mediaForPreview.sizes,
                  }}
                  sizes="80px"
                  className="h-20 w-20 shrink-0 rounded-[calc(var(--radius)-8px)] border object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="min-w-0">
                <p className="truncate font-medium">{preview?.name || value._id}</p>
                <p className="text-muted-foreground">{preview?.mime || 'Unknown mime'}</p>
              </div>
            </div>
          </Card>
        ) : null}
        <Dialog open={manageMediaOpen} onOpenChange={setManageMediaOpen}>
          <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] max-w-7xl! overflow-hidden">
            <DialogHeader>
              <DialogTitle>{t('contentEdit.manageSelectedMedia')}</DialogTitle>
              <DialogDescription>
                {t('contentEdit.manageSelectedMediaDescription')}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[68vh] pr-3">
              <Sortable
                value={selectedMediaItems}
                onValueChange={handleMultipleSort}
                getItemValue={(item) => item._id}
                orientation="mixed"
              >
                <SortableContent className="grid grid-cols-2 gap-3 pb-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {selectedMediaItems.map((media) => (
                    <SortableItem key={media._id} value={media._id} asChild>
                      <div>
                        <SelectedMediaListItem
                          media={media}
                          onDelete={handleMultipleDelete}
                          layout="grid"
                        />
                      </div>
                    </SortableItem>
                  ))}
                </SortableContent>
              </Sortable>
            </ScrollArea>
            <DialogFooter>
              <Button type="button" onClick={() => setManageMediaOpen(false)}>
                {t('common.done')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FieldWrapper>
  )
}

export default FileField
