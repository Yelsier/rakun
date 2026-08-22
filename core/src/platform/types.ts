export type RakunRuntime = 'node' | 'bun'

export type RakunFramework = 'standalone' | 'next' | 'express'

export type RakunDeployment = 'serverless' | 'persistent' | 'edge'

export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif'

export type ImageMetadata = {
  width?: number
  height?: number
  format?: string
}

export type ImageTransformOptions = {
  width?: number
  format: ImageFormat
  quality: number
  autoOrient?: boolean
  withoutEnlargement?: boolean
}

export interface ImageProcessor {
  readonly id: string
  metadata(input: Uint8Array): Promise<ImageMetadata>
  transform(input: Uint8Array, options: ImageTransformOptions): Promise<Uint8Array>
}

export type RealtimeTransport = 'polling' | 'sse' | 'websocket'

export type RealtimeMetadata =
  | {
      transport: 'polling'
      intervalMs: number
    }
  | {
      transport: 'sse'
      endpoint: string
    }
  | {
      transport: 'websocket'
      endpoint: string
    }

export interface RealtimeProvider {
  readonly metadata: RealtimeMetadata
  subscribe(topic: string, onChange: () => void, options?: { intervalMs?: number }): () => void
  publish(topic: string): void
}

export type BinaryEncoding = 'hex' | 'base64url'

export interface CryptoProvider {
  randomBytes(size: number): Uint8Array
  randomUUID(): string
  hash(algorithm: 'sha256', value: string | Uint8Array, encoding: BinaryEncoding): string
  hmac(
    algorithm: 'sha256',
    secret: string | Uint8Array,
    value: string | Uint8Array,
    encoding: BinaryEncoding
  ): string
  timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean
}

export interface FilesystemProvider {
  makeTemporaryDirectory(prefix: string): Promise<string>
  readFile(path: string): Promise<Uint8Array>
  writeFile(path: string, content: Uint8Array): Promise<void>
  remove(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>
}

export interface CompressionProvider {
  gzip(input: Uint8Array): Promise<Uint8Array>
  gunzip(input: Uint8Array): Promise<Uint8Array>
}

export type WorkerProcessResult = {
  exitCode: number | null
  stderr: string
}

export interface WorkersProvider {
  runProcess(
    executable: string,
    args: readonly string[],
    options?: { windowsHide?: boolean }
  ): Promise<WorkerProcessResult>
}

export interface Platform {
  readonly runtime: RakunRuntime
  readonly framework: RakunFramework
  readonly deployment: RakunDeployment
  readonly image: ImageProcessor
  readonly realtime: RealtimeProvider
  readonly crypto: CryptoProvider
  readonly filesystem: FilesystemProvider
  readonly compression: CompressionProvider
  readonly workers: WorkersProvider
}

export type PlatformOptions = {
  runtime?: RakunRuntime
  framework?: RakunFramework
  deployment?: RakunDeployment
  image?: ImageProcessor
  realtime?: RealtimeProvider
  crypto?: CryptoProvider
  filesystem?: FilesystemProvider
  compression?: CompressionProvider
  workers?: WorkersProvider
}
