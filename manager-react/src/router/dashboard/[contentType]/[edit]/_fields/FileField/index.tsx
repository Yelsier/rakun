'use client'

import { GripVertical, ImagePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { EncodedFileField } from '@rakun-kit/core/client'
import type { TranslatableValue } from '@rakun-kit/core/types'

import { FieldRef } from '../../ContentTypeEdit'
import { FieldWrapper } from '../shared/FieldWrapper'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { useTRPC, useTRPCClient } from '@/components/trpc-provider'
import { useEditErrorStore } from '@/hooks/app-store'
import type { MediaRecord } from '@/lib/media'
import { formatFileSize } from '@/components/media/previews/utils/mediaPreview'
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
    Pick<MediaRecord, 'access' | 'key' | 'mime' | 'previewKey' | 'previewUrl' | 'size' | 'url'>
  >

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
}: {
  media: MediaPreviewListItem
  onDelete: (id: string) => void
}) => {
  const trpcClient = useTRPCClient()
  const canResolvePreview = Boolean(
    media.mime?.startsWith('image/') && media.access && (media.previewKey || media.key)
  )
  const { data: previewUrl } = useQuery({
    queryKey: [
      'file-field-media-list-preview-url',
      media._id,
      media.previewKey || media.key,
      media.access,
    ],
    enabled: canResolvePreview,
    queryFn: async () => {
      if (media.previewUrl) return media.previewUrl
      if (media.url) return media.url
      if (!media.key || !media.access) return ''

      const result = (await trpcClient.manager.media.getUrl.query({
        key: media.previewKey || media.key,
        access: media.access,
      })) as { url: string }

      return result.url
    },
  })

  const metadata = [
    typeof media.size === 'number' ? formatFileSize(media.size) : null,
    media.mime || null,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border bg-background p-2">
      <SortableItemHandle asChild>
        <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0">
          <GripVertical className="size-4" />
          <span className="sr-only">Reorder media</span>
        </Button>
      </SortableItemHandle>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={media.name || 'Selected image'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlus className="text-muted-foreground size-5" />
        )}
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
        <span className="sr-only">Remove media</span>
      </Button>
    </div>
  )
}

const FileField: React.FC<FileFieldProps> = ({ ref, ...props }) => {
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

  const { data: previewUrl } = useQuery({
    queryKey: [
      'file-field-media-preview-url',
      mediaForPreview?._id,
      mediaForPreview?.previewKey || mediaForPreview?.key,
      mediaForPreview?.access,
    ],
    enabled: !!mediaForPreview && mediaForPreview.mime.startsWith('image/'),
    queryFn: async () => {
      if (!mediaForPreview) return ''
      if (mediaForPreview.previewUrl) return mediaForPreview.previewUrl
      if (mediaForPreview.url) return mediaForPreview.url
      const result = (await trpcClient.manager.media.getUrl.query({
        key: mediaForPreview.previewKey || mediaForPreview.key,
        access: mediaForPreview.access,
      })) as { url: string }
      return result.url
    },
  })

  const getValue = () => {
    if (props.isMultiple) {
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
        toast.error(`Selected files are not valid ${props.mediaType} media`)
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
      toast.error(`Selected file is not a valid ${props.mediaType} media type`)
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
                Clear
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
              Clear
            </Button>
          ) : null}
        </div>
        {props.isMultiple ? (
          valueList.length > 0 ? (
            <Card className="p-3 text-sm">
              <div className="space-y-3">
                <p className="font-medium">{valueList.length} media selected</p>
                <Sortable
                  value={selectedMediaItems}
                  onValueChange={handleMultipleSort}
                  getItemValue={(item) => item._id}
                >
                  <SortableContent className="flex flex-col gap-2">
                    {selectedMediaItems.map((media) => (
                      <SortableItem key={media._id} value={media._id} asChild>
                        <div>
                          <SelectedMediaListItem media={media} onDelete={handleMultipleDelete} />
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContent>
                </Sortable>
              </div>
            </Card>
          ) : null
        ) : value ? (
          <Card className="p-3 text-sm">
            <div className="flex items-center gap-3">
              {mediaForPreview?.mime?.startsWith('image/') && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={preview?.name || 'Selected image'}
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
      </div>
    </FieldWrapper>
  )
}

export default FileField
