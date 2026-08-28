import { getMediaService } from './index'

const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

export type HandlePublicMediaRequestInput = {
  request: Request
  pathSegments: string[]
}

const decodePathSegment = (segment: string): string | null => {
  try {
    const value = decodeURIComponent(segment)
    if (!value || value === '.' || value === '..' || value.includes('/')) return null
    return value
  } catch {
    return null
  }
}

export const getPublicMediaKey = (pathSegments: string[]): string | null => {
  if (pathSegments.length === 0) return null

  const segments = pathSegments.map(decodePathSegment)
  if (segments.some((segment) => segment === null)) return null

  return `public/${segments.join('/')}`
}

const errorResponse = (status: number): Response => new Response(null, { status })

const isNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const value = error as {
    name?: string
    code?: string
    $metadata?: { httpStatusCode?: number }
  }
  return (
    value.name === 'NotFound' ||
    value.name === 'NoSuchKey' ||
    value.code === 'NotFound' ||
    value.code === 'NoSuchKey' ||
    value.$metadata?.httpStatusCode === 404
  )
}

const getErrorStatus = (error: unknown): number => {
  if (isNotFoundError(error)) return 404
  const status =
    error && typeof error === 'object'
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined
  if (status === 416) {
    return 416
  }
  return 502
}

const setDateHeader = (headers: Headers, name: string, value: Date | string | undefined): void => {
  if (!value) return
  headers.set(name, value instanceof Date ? value.toUTCString() : value)
}

const buildHeaders = (object: {
  acceptRanges?: string
  cacheControl?: string
  contentDisposition?: string
  contentEncoding?: string
  contentLanguage?: string
  contentLength?: number
  contentRange?: string
  contentType?: string
  etag?: string
  expires?: Date | string
  lastModified?: Date | string
}): Headers => {
  const headers = new Headers({
    'Cache-Control': object.cacheControl ?? DEFAULT_CACHE_CONTROL,
    'X-Content-Type-Options': 'nosniff',
  })
  if (object.acceptRanges) headers.set('Accept-Ranges', object.acceptRanges)
  if (object.contentDisposition) headers.set('Content-Disposition', object.contentDisposition)
  if (object.contentEncoding) headers.set('Content-Encoding', object.contentEncoding)
  if (object.contentLanguage) headers.set('Content-Language', object.contentLanguage)
  if (object.contentLength !== undefined) headers.set('Content-Length', String(object.contentLength))
  if (object.contentRange) headers.set('Content-Range', object.contentRange)
  if (object.contentType) headers.set('Content-Type', object.contentType)
  if (object.etag) headers.set('ETag', object.etag)
  setDateHeader(headers, 'Expires', object.expires)
  setDateHeader(headers, 'Last-Modified', object.lastModified)
  return headers
}

export const handlePublicMediaRequest = async ({
  request,
  pathSegments,
}: HandlePublicMediaRequestInput): Promise<Response | null> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null

  let adapter: ReturnType<typeof getMediaService>['rawAdapter']
  try {
    adapter = getMediaService().rawAdapter
  } catch {
    return null
  }
  if (!adapter.getPublicObject) return null

  const key = getPublicMediaKey(pathSegments)
  if (!key) return errorResponse(404)

  try {
    const object = await adapter.getPublicObject({
      key,
      method: request.method,
      range: request.headers.get('Range') ?? undefined,
    })
    const headers = buildHeaders(object)
    const status = object.status ?? (object.contentRange ? 206 : 200)

    if (request.headers.get('If-None-Match') === object.etag) {
      return new Response(null, { status: 304, headers })
    }

    return new Response(request.method === 'HEAD' ? null : object.body ?? null, {
      status,
      headers,
    })
  } catch (error) {
    return errorResponse(getErrorStatus(error))
  }
}
