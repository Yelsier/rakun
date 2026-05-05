import { createContext, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  FileOptimizeOptions,
  FinalizeUploadInput,
  FinalizeUploadOutput,
  GetMediaUrlInput,
  GetMediaUrlOutput,
  PrepareUploadInput,
  PrepareUploadOutput,
} from '@rakun-kit/core/client'

import { useManagerClient } from '@/client/react'
import type { ManagerClient } from '@/client/request'

export type MediaClient = Pick<ManagerClient, 'request'>

export type ExistingRelation<CT extends string> = {
  type: 'existing'
  _id: string
  contentType: CT
}

export type SelfRelation<CT extends string> = {
  type: 'self'
  _id: string
  contentType: CT
}

export type MediaStatus = 'uploaded' | 'archived' | 'deleted'

export type MediaFolderRecord = {
  _id: string
  _type: 'MediaFolder'
  name: string
  slug: string
  path: string
  parent?: SelfRelation<'MediaFolder'>
  description?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export type MediaRecord = {
  _id: string
  _type: 'Media'
  name: string
  originalName: string
  key: string
  access: 'public' | 'private'
  mime: string
  extension?: string
  size: number
  etag?: string
  url?: string
  previewKey?: string
  previewUrl?: string
  previewMime?: string
  width?: number
  height?: number
  orientation?: 'portrait' | 'landscape'
  optimized?: boolean
  optimizedFormat?: string
  optimizationQuality?: number
  originalSize?: number
  folder?: ExistingRelation<'MediaFolder'>
  uploadedAt: Date
  status: MediaStatus
  createdBy?: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const toSelfRelation = <CT extends string>(
  contentType: CT,
  id: string,
): SelfRelation<CT> => ({
  type: 'self',
  _id: id,
  contentType,
})

export async function prepareMediaUpload(
  input: PrepareUploadInput,
  mediaClient: MediaClient,
): Promise<PrepareUploadOutput> {
  return await mediaClient.request('manager.media.prepareUpload', input)
}

export async function uploadFileToPresignedUrl(params: {
  file: Blob
  prepared: PrepareUploadOutput
  optimizeOptions?: FileOptimizeOptions
  fetchImpl?: typeof fetch
  signal?: AbortSignal
  apiBase?: string
}): Promise<{
  key: string
  access: 'public' | 'private'
  size: number
  mime: string
  fileName: string
  width?: number
  height?: number
  orientation?: 'portrait' | 'landscape'
  previewKey?: string
  previewMime?: string
  optimized: boolean
  optimizedFormat?: string
  optimizationQuality?: number
  originalSize: number
}> {
  const fetchImpl = params.fetchImpl ?? fetch
  const apiBase =
    params.apiBase ||
    (typeof window !== 'undefined' ? window.location.origin : '')

  const url = new URL(params.prepared.url, apiBase)

  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: {
      ...(params.prepared.headers ?? {}),
      'Content-Type': 'application/octet-stream',
      'x-cms-upload-mime': params.file.type || 'application/octet-stream',
      'x-cms-upload-key': params.prepared.key,
      'x-cms-upload-access': params.prepared.access,
      'x-cms-upload-file-name':
        params.file instanceof File ? params.file.name : 'upload.bin',
      ...(params.optimizeOptions
        ? {
            'x-cms-upload-optimize': JSON.stringify(params.optimizeOptions),
          }
        : {}),
    },
    body: params.file,
    signal: params.signal,
    credentials: 'include',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Upload failed (${response.status})${text ? `: ${text}` : ''}`,
    )
  }

  return (await response.json()) as {
    key: string
    access: 'public' | 'private'
    size: number
    mime: string
    fileName: string
    width?: number
    height?: number
    orientation?: 'portrait' | 'landscape'
    previewKey?: string
    previewMime?: string
    optimized: boolean
    optimizedFormat?: string
    optimizationQuality?: number
    originalSize: number
  }
}

export async function finalizeMediaUpload(
  input: FinalizeUploadInput,
  mediaClient: MediaClient,
): Promise<FinalizeUploadOutput> {
  return await mediaClient.request('manager.media.finalizeUpload', input)
}

export async function resolveMediaUrl(
  input: GetMediaUrlInput,
  mediaClient: MediaClient,
): Promise<GetMediaUrlOutput> {
  return await mediaClient.request('manager.media.getUrl', input)
}

export async function uploadMediaFile(
  input: {
    file: File
    access?: PrepareUploadInput['access']
    folder?: PrepareUploadInput['folder']
    folderId?: string
    folderPath?: string
    key?: PrepareUploadInput['key']
    name?: string
    fileName?: string
    mime?: string
    optimizeOptions?: FileOptimizeOptions
    status?: FinalizeUploadInput['status']
    signal?: AbortSignal
    fetchImpl?: typeof fetch
    apiBase?: string
  },
  mediaClient: MediaClient,
): Promise<{
  prepared: PrepareUploadOutput
  finalized: FinalizeUploadOutput
}> {
  const prepared = await prepareMediaUpload(
    {
      fileName: input.fileName ?? input.file.name,
      mime: input.mime ?? (input.file.type || 'application/octet-stream'),
      size: input.file.size,
      access: input.access,
      folder: input.folder,
      key: input.key,
    },
    mediaClient,
  )

  const uploaded = await uploadFileToPresignedUrl({
    file: input.file,
    prepared,
    optimizeOptions: input.optimizeOptions,
    signal: input.signal,
    fetchImpl: input.fetchImpl,
    apiBase: input.apiBase,
  })

  const finalized = await finalizeMediaUpload(
    {
      key: uploaded.key,
      access: uploaded.access,
      fileName: uploaded.fileName,
      mime: uploaded.mime,
      size: uploaded.size,
      previewKey: uploaded.previewKey,
      previewMime: uploaded.previewMime,
      width: uploaded.width,
      height: uploaded.height,
      orientation: uploaded.orientation,
      optimized: uploaded.optimized,
      optimizedFormat: uploaded.optimizedFormat,
      optimizationQuality: uploaded.optimizationQuality,
      originalSize: uploaded.originalSize,
      name: input.name,
      folderId: input.folderId,
      folderPath: input.folderPath,
      status: input.status,
    },
    mediaClient,
  )

  return { prepared, finalized }
}

export async function getMediaFolderById(
  id: string,
  mediaClient: MediaClient,
): Promise<MediaFolderRecord> {
  return (await mediaClient.request('manager.get', {
    contentType: 'MediaFolder',
    id,
  })) as MediaFolderRecord
}

export async function listMediaFolders(
  mediaClient: MediaClient,
): Promise<{
  items: MediaFolderRecord[]
}> {
  return listMediaFoldersByParent(undefined, mediaClient)
}

export async function listMediaFoldersByParent(
  parentId: string | undefined,
  mediaClient: MediaClient,
): Promise<{
  items: MediaFolderRecord[]
}> {
  const result = (await mediaClient.request('manager.media.listFolders', {
    parentId,
  })) as {
    items: Array<{
      _id: string
      name: string
      slug: string
      path: string
      parentId?: string
      description?: string
    }>
  }

  return {
    items: result.items.map((item) => ({
      _id: item._id,
      _type: 'MediaFolder',
      name: item.name,
      slug: item.slug,
      path: item.path,
      parent: item.parentId
        ? toSelfRelation('MediaFolder', item.parentId)
        : undefined,
      description: item.description,
    })),
  }
}

export async function createMediaFolder(
  input: {
    name: string
    slug?: string
    path?: string
    parentId?: string
    description?: string
  },
  mediaClient: MediaClient,
): Promise<MediaFolderRecord> {
  const created = (await mediaClient.request('manager.media.createFolder', {
    name: input.name,
    parentId: input.parentId,
    description: input.description,
  })) as {
    _id: string
    name: string
    slug: string
    path: string
    parentId?: string
    description?: string
  }

  return {
    _id: created._id,
    _type: 'MediaFolder',
    name: created.name,
    slug: created.slug,
    path: created.path,
    parent: created.parentId
      ? toSelfRelation('MediaFolder', created.parentId)
      : undefined,
    description: created.description,
  }
}

export async function listMediaByFolder(
  folderId: string | undefined,
  mediaClient: MediaClient,
): Promise<{
  totalItems: number
  items: MediaRecord[]
}> {
  const result = (await mediaClient.request('manager.list', {
    contentType: 'Media',
    query: {
      filter: folderId
        ? { 'folder._id': folderId }
        : { folder: { $exists: false } },
      options: {
        limit: 'all',
        sort: {
          uploadedAt: 'desc',
        },
      },
    },
  })) as {
    totalItems: number
    items: MediaRecord[]
  }

  return {
    totalItems: result.totalItems,
    items: result.items,
  }
}

export type MediaLibraryTypeFilter = 'all' | 'image' | 'video' | 'document'

export type OpenMediaLibraryOptions = {
  mediaType?: 'Image' | 'Video' | 'Document' | 'Any'
  optimizeOptions?: FileOptimizeOptions
  multiple?: boolean
  initialSelectedMedia?: MediaRecord[]
}

export type ManagerMediaPickerRenderArgs = {
  isOpen: boolean
  selectedMedia: MediaRecord | null
  selectedMediaIds: Set<string>
  forcedMediaTypeFilter: MediaLibraryTypeFilter
  forcedOptimizeOptions?: FileOptimizeOptions
  isMultipleSelection: boolean
  selectedMediaList: MediaRecord[]
  close: () => void
  select: (media: MediaRecord) => void
  confirmMultiple: () => void
}

type MediaContextValue = {
  selectedMedia: MediaRecord | null
  isMediaLibraryOpen: boolean
  openMediaLibrary: (
    options?: OpenMediaLibraryOptions,
  ) => Promise<MediaRecord | MediaRecord[] | null>
  closeMediaLibrary: () => void
  setSelectedMedia: (media: MediaRecord | null) => void
  getSelectedMedia: () => MediaRecord | null
  uploadMedia: (
    input: Parameters<typeof uploadMediaFile>[0],
  ) => Promise<MediaRecord>
}

const MediaContext = createContext<MediaContextValue | null>(null)

const mapMediaTypeToFilter = (
  mediaType?: OpenMediaLibraryOptions['mediaType'],
): MediaLibraryTypeFilter => {
  if (!mediaType || mediaType === 'Any') return 'all'
  if (mediaType === 'Image') return 'image'
  if (mediaType === 'Video') return 'video'
  if (mediaType === 'Document') return 'document'
  return 'all'
}

export type ManagerMediaProviderProps = {
  children: ReactNode
  renderPicker: (args: ManagerMediaPickerRenderArgs) => ReactNode
}

export const ManagerMediaProvider = ({
  children,
  renderPicker,
}: ManagerMediaProviderProps) => {
  const managerClient = useManagerClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaRecord | null>(null)
  const [forcedMediaTypeFilter, setForcedMediaTypeFilter] =
    useState<MediaLibraryTypeFilter>('all')
  const [forcedOptimizeOptions, setForcedOptimizeOptions] = useState<
    FileOptimizeOptions | undefined
  >(undefined)
  const [isMultipleSelection, setIsMultipleSelection] = useState(false)
  const [selectedMediaList, setSelectedMediaList] = useState<MediaRecord[]>([])
  const resolverRef = useRef<
    ((media: MediaRecord | MediaRecord[] | null) => void) | null
  >(null)

  const resolveAndClose = (value: MediaRecord | MediaRecord[] | null) => {
    setIsOpen(false)
    setForcedMediaTypeFilter('all')
    setForcedOptimizeOptions(undefined)
    setIsMultipleSelection(false)
    setSelectedMediaList([])
    if (resolverRef.current) {
      resolverRef.current(value)
      resolverRef.current = null
    }
  }

  const value = useMemo<MediaContextValue>(
    () => ({
      selectedMedia,
      isMediaLibraryOpen: isOpen,
      openMediaLibrary: async (options) => {
        setForcedMediaTypeFilter(mapMediaTypeToFilter(options?.mediaType))
        setForcedOptimizeOptions(options?.optimizeOptions)
        setIsMultipleSelection(!!options?.multiple)
        setSelectedMediaList(options?.initialSelectedMedia ?? [])
        setIsOpen(true)
        return await new Promise<MediaRecord | MediaRecord[] | null>(
          (resolve) => {
            resolverRef.current = resolve
          },
        )
      },
      closeMediaLibrary: () => {
        resolveAndClose(null)
      },
      setSelectedMedia,
      getSelectedMedia: () => selectedMedia,
      uploadMedia: async (input) => {
        const result = await uploadMediaFile(input, managerClient)
        const media = result.finalized.media as MediaRecord | undefined
        if (!media) {
          throw new Error('Upload finished but no media record was returned.')
        }
        setSelectedMedia(media)
        return media
      },
    }),
    [isOpen, managerClient, selectedMedia],
  )

  return (
    <MediaContext.Provider value={value}>
      {children}
      {renderPicker({
        isOpen,
        selectedMedia,
        selectedMediaIds: new Set(selectedMediaList.map((item) => item._id)),
        forcedMediaTypeFilter,
        forcedOptimizeOptions,
        isMultipleSelection,
        selectedMediaList,
        close: () => resolveAndClose(null),
        select: (media) => {
          if (isMultipleSelection) {
            setSelectedMediaList((prev) =>
              prev.some((item) => item._id === media._id)
                ? prev.filter((item) => item._id !== media._id)
                : [...prev, media],
            )
            return
          }
          setSelectedMedia(media)
          resolveAndClose(media)
        },
        confirmMultiple: () => {
          resolveAndClose(selectedMediaList)
        },
      })}
    </MediaContext.Provider>
  )
}

export const useMedia = () => {
  const ctx = useContext(MediaContext)
  if (!ctx) {
    throw new Error('useMedia must be used within <ManagerMediaProvider>')
  }
  return ctx
}
