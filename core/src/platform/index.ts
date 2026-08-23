import { bunImage, hasBunImage, sharpImage } from './image'
import { nodeCompression, nodeCrypto, nodeFilesystem, nodeWorkers } from './node'
import { pollingRealtime } from './realtime'
import { detectRuntime } from './runtime'
import type { Platform, PlatformOptions } from './types'

let defaultPlatform: Platform | null = null

export const createPlatform = (options: PlatformOptions = {}): Platform => {
  const runtime = options.runtime ?? detectRuntime()

  return {
    runtime,
    framework: options.framework ?? 'standalone',
    deployment: options.deployment ?? 'persistent',
    image: options.image ?? (runtime === 'bun' && hasBunImage() ? bunImage() : sharpImage()),
    realtime: options.realtime ?? pollingRealtime(),
    crypto: options.crypto ?? nodeCrypto(),
    filesystem: options.filesystem ?? nodeFilesystem(),
    compression: options.compression ?? nodeCompression(),
    workers: options.workers ?? nodeWorkers(),
  }
}

export const getPlatform = (): Platform => {
  defaultPlatform ??= createPlatform()
  return defaultPlatform
}

export const setPlatform = (platform: Platform): void => {
  defaultPlatform = platform
}

export const resolvePlatform = (platform?: Platform): Platform => platform ?? createPlatform()

export * from './image'
export * from './node'
export * from './realtime'
export * from './realtimeServer'
export * from './realtimeTopics'
export * from './runtime'
export type * from './types'
