import { Media } from '../../../internal-content-types'
import type ContentType from '../../../lib/ContentType'
import { getContentTypeByName } from '../../../lib/Registry'
import type { DBOutput, DataPopulated } from '../../../lib/types'
import { hasKeys } from '../../../lib/utils/hasKeys'
import { getMediaService } from '../../../media'
import { getMongoService } from '../../../orm'
import { getMongoDB } from '../../../orm/mongodbPeer'
import { populateFields } from './populateLinks'

type MediaSizeRecord = {
  key: string
  url?: string
  width: number
  height: number
  mime: string
  size: number
}

type ResolvedMediaSizeRecord = MediaSizeRecord & {
  url: string
}

type PopulateRelationsOptions = {
  exposePrivateMedia?: boolean
}

const toMediaSizeRecords = (value: unknown): MediaSizeRecord[] => {
  if (!Array.isArray(value)) return []

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const record = item as Record<string, unknown>
    if (
      typeof record.key !== 'string' ||
      typeof record.width !== 'number' ||
      typeof record.height !== 'number' ||
      typeof record.mime !== 'string' ||
      typeof record.size !== 'number'
    ) {
      return []
    }

    return [
      {
        key: record.key,
        url: typeof record.url === 'string' ? record.url : undefined,
        width: record.width,
        height: record.height,
        mime: record.mime,
        size: record.size,
      },
    ]
  })
}

const buildSrcSet = (
  sizes: MediaSizeRecord[],
  original?: { url: string; width?: number | null }
): string | null => {
  const entries = [...sizes]

  if (original?.url && original.width && !entries.some((size) => size.width === original.width)) {
    entries.push({
      key: '',
      url: original.url,
      width: original.width,
      height: 1,
      mime: '',
      size: 0,
    })
  }

  const srcSet = entries
    .filter((size) => size.url && size.width > 0)
    .sort((a, b) => a.width - b.width)
    .map((size) => `${size.url} ${size.width}w`)
    .join(', ')

  return srcSet || null
}

/**
 *
 * @param data - The raw database output for a content item, which may include relation references.
 * @returns  A new object with all relation references resolved to their full populated data, suitable for API output.
 *
 * This function recursively traverses the input data, looking for relation references (objects with a "type" of "existing" or "new"). For "existing" relations, it fetches the related content from the database and replaces the reference with the full populated object. For "new" relations, it processes the provided data as if it were a new content item, assigning it a temporary _id. The function also handles special cases like file fields pointing to Media items, resolving them to include the media URL and metadata. The final output is a fully populated object with all relations resolved, ready for API consumption.
 * @example
 * const rawData = {
 *   title: 'Example Title',
 *   author: { type: 'existing', _id: '123', contentType: 'Author' },
 *   media: { type: 'existing', _id: '456', contentType: 'Media' }
 * }
 * const populatedData = await populateRelations(rawData)
 * console.log(populatedData)
 * // Output might look like:
 * // {
 * //   title: 'Example Title',
 * //   author: { _id: '123', name: 'John Doe' },
 * //   media: { url: 'https://example.com/media.jpg', name: 'Media Name', mime: 'image/jpeg' }
 * // }
 */
export function populateRelations<T extends ContentType>(
  data: DBOutput<T>,
  options?: PopulateRelationsOptions
): Promise<DataPopulated<T>>
export function populateRelations<T extends ContentType>(
  data: DBOutput<T>[],
  options?: PopulateRelationsOptions
): Promise<DataPopulated<T>[]>
export async function populateRelations<T extends ContentType>(
  data: DBOutput<T> | DBOutput<T>[],
  options: PopulateRelationsOptions = {}
): Promise<DataPopulated<T> | DataPopulated<T>[]> {
  const db = await getMongoService()
  const { ObjectId } = getMongoDB()

  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => populateRelations(item, options)))
  }

  const currentContentType =
    typeof data?._type === 'string' ? getContentTypeByName(data._type) : null

  // Recursively populate arrays, translatable maps, relations, and nested objects.
  const populateValue = async (value: unknown, fieldName?: string): Promise<unknown> => {
    // Keep array order but resolve each element concurrently.
    if (Array.isArray(value)) {
      return Promise.all(value.map((v) => populateValue(v, fieldName)))
    }

    // Translatable fields store values per language plus the _tag marker.
    if (hasKeys(value) && value._tag === 'Translatable') {
      const entries = Object.entries(value)
      const populatedEntries = await Promise.all(
        entries.map(async ([k, v]) => {
          if (k === '_tag') return [k, v]
          return [k, await populateValue(v, fieldName)]
        })
      )

      return Object.fromEntries(populatedEntries)
    }

    if (value && typeof value === 'object' && 'type' in value) {
      // Resolve existing relations from the DB and continue recursively.
      if (value.type === 'existing' && '_id' in value && 'contentType' in value) {
        const _id = value._id as string
        const contentTypeName = value.contentType as string
        const isFileField =
          !!fieldName &&
          (currentContentType?.fields?.[fieldName]?.getConfig().type as string | undefined) ===
            'File'

        // File fields pointing to Media are projected to API output shape.
        if (isFileField && contentTypeName === 'Media') {
          try {
            const media = await db.get(Media, _id)
            if (media.access === 'private' && !options.exposePrivateMedia) {
              return {
                key: media.key,
                access: media.access,
                url: '',
                previewKey: media.previewKey ?? null,
                previewUrl: null,
                name: media.name || '',
                title: media.title || media.name || '',
                alt: media.alt || null,
                mime: media.mime || '',
                width: media.width ?? null,
                height: media.height ?? null,
                size: media.size ?? 0,
                orientation: media.orientation ?? null,
                sizes: undefined,
                srcSet: null,
              }
            }
            const mediaService = getMediaService()
            const mediaSizes = toMediaSizeRecords((media as { sizes?: unknown }).sizes)
            const [resolved, resolvedPreview] = await Promise.all([
              mediaService
                .getMediaUrl({
                  key: media.key,
                  access: media.access,
                })
                .catch(() => null),
              media.previewUrl?.startsWith('data:')
                ? Promise.resolve({ url: media.previewUrl })
                : media.previewKey
                  ? mediaService
                      .getMediaUrl({
                        key: media.previewKey,
                        access: media.access,
                      })
                      .catch(() => null)
                  : Promise.resolve(null),
            ])
            const resolvedSizes = (
              await Promise.all(
                mediaSizes.map(async (size) => {
                  const resolvedSize = await mediaService
                    .getMediaUrl({
                      key: size.key,
                      access: media.access,
                    })
                    .catch(() => null)
                  const url = resolvedSize?.url || size.url
                  if (!url) return null

                  return {
                    ...size,
                    url,
                  }
                })
              )
            ).filter((size): size is ResolvedMediaSizeRecord => size !== null)
            const originalUrl = resolved?.url || media.url || ''

            return {
              key: media.key,
              access: media.access,
              url: originalUrl,
              previewKey: media.previewKey ?? null,
              previewUrl: resolvedPreview?.url || media.previewUrl || null,
              name: media.name || '',
              title: media.title || media.name || '',
              alt: media.alt || null,
              mime: media.mime || '',
              width: media.width ?? null,
              height: media.height ?? null,
              size: media.size ?? 0,
              orientation: media.orientation ?? null,
              sizes: resolvedSizes.length ? resolvedSizes : undefined,
              srcSet: buildSrcSet(resolvedSizes, {
                url: originalUrl,
                width: media.width,
              }),
            }
          } catch (_) {
            return {
              url: '',
              previewUrl: null,
              name: '',
              title: '',
              alt: null,
              mime: '',
              width: null,
              height: null,
              size: 0,
              orientation: null,
              srcSet: null,
            }
          }
        }

        return db.get(getContentTypeByName(contentTypeName), _id).then((populated) => {
          // Keep original value if the target no longer exists.
          if (!populated) return Promise.resolve(value)
          return populateFields(populated as DBOutput<T>).then(
            (linksPopulated) =>
              populateRelations(linksPopulated as DBOutput<T>, options) as Promise<unknown>
          )
        })
      }

      // Inline "new" relation payloads as fully populated objects.
      if (value.type === 'new' && 'data' in value) {
        const data = value.data as DBOutput<T>
        return {
          ...(await populateRelations(await populateFields(data), options)),
          _id: new ObjectId().toString(),
        }
      }
    }

    // Traverse plain objects so deeply nested relation values are handled too.
    if (hasKeys(value)) {
      const entries = Object.entries(value)
      const populatedEntries = await Promise.all(
        entries.map(async ([k, v]) => [k, await populateValue(v)] as const)
      )

      return Object.fromEntries(populatedEntries)
    }

    // Primitive values are returned as-is.
    return Promise.resolve(value)
  }

  // Populate each top-level field concurrently, preserving original keys.
  const entries = Object.entries(data)
  const populatedValues = await Promise.all(entries.map(([k, v]) => populateValue(v, k)))

  // Filter out createdBy and updatedBy fields since they are only for internal use and not part of the public API output.
  const result = Object.fromEntries(
    entries.flatMap(([k], i) =>
      k === 'createdBy' || k === 'updatedBy' ? [] : [[k, populatedValues[i]]]
    )
  )

  return result as DataPopulated<T>
}
