import type { MediaRecord } from '@/lib/media'

export type MediaDownloadAsset = {
  key: string
  url?: string
  mime: string
  size: number
  width?: number
  height?: number
  primary: boolean
}

const assetIdentity = (asset: Pick<MediaDownloadAsset, 'key' | 'url'>): string =>
  asset.key || asset.url || ''

export const getMediaDownloadAssets = (media: MediaRecord): MediaDownloadAsset[] => {
  const candidates: MediaDownloadAsset[] = [
    {
      key: media.key,
      url: media.url,
      mime: media.mime,
      size: media.size,
      width: media.width,
      height: media.height,
      primary: true,
    },
    ...(media.sizes ?? []).map((size) => ({
      ...size,
      primary: false,
    })),
    ...(media.sources ?? []).map((source) => ({
      ...source,
      primary: false,
    })),
  ]

  return candidates.filter((asset, index, all) => {
    const identity = assetIdentity(asset)
    return !!identity && all.findIndex((candidate) => assetIdentity(candidate) === identity) === index
  })
}

const extensionByMime: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
  'text/plain': 'txt',
  'video/quicktime': 'mov',
}

const getAssetExtension = (asset: MediaDownloadAsset): string => {
  const keyExtension = asset.key.split(/[?#]/, 1)[0]?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (keyExtension) return keyExtension.toLowerCase()

  return (
    extensionByMime[asset.mime.toLowerCase()] ??
    asset.mime.split('/')[1]?.split('+')[0]?.toLowerCase() ??
    'bin'
  )
}

export const getMediaDownloadFileName = (
  media: MediaRecord,
  asset: MediaDownloadAsset,
): string => {
  const sourceName = media.originalName || media.name || 'media'
  const safeName = sourceName.split(/[\\/]/).pop() || 'media'
  const baseName = safeName.replace(/\.[^.]+$/, '') || 'media'
  const sizeSuffix = !asset.primary && asset.width ? `-${asset.width}w` : ''

  return `${baseName}${sizeSuffix}.${getAssetExtension(asset)}`
}
