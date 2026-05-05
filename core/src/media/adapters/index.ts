export type MediaAccess = 'public' | 'private'

export type PresignedPut = {
  url: string
  headers?: Record<string, string>
  key: string
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
}
