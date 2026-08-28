export type MediaAccess = 'public' | 'private'

export type PresignedPut = {
  url: string
  headers?: Record<string, string>
  key: string
}

export type PublicMediaObject = {
  body?: ReadableStream<Uint8Array>
  status?: number
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
}

export interface StorageAdapter {
  createPresignedPut(input: {
    key: string
    mime: string
    size: number
    access: MediaAccess
  }): Promise<PresignedPut>

  putObject(input: {
    key: string
    mime: string
    content: Uint8Array
    access: MediaAccess
  }): Promise<void>

  headObject(input: { key: string; access: MediaAccess }): Promise<{
    size: number
    mime?: string
    etag?: string
  }>

  createPresignedGet(input: {
    key: string
    access: MediaAccess
    expiresInSeconds: number
  }): Promise<{ url: string; expiresAt: Date }>

  deleteObject(input: { key: string; access: MediaAccess }): Promise<void>

  publicUrl(input: { key: string; access: MediaAccess }): string | null

  getPublicObject?(input: {
    key: string
    method: 'GET' | 'HEAD'
    range?: string
  }): Promise<PublicMediaObject>
}
