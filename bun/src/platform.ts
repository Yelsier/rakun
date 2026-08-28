import { createPlatform, sseRealtime, type Platform, type PlatformOptions } from '@rakun-kit/core'

export type BunPlatformOptions = Omit<PlatformOptions, 'deployment' | 'framework' | 'runtime'> & {
  realtimeEndpoint?: string
}

export const createBunPlatform = (options: BunPlatformOptions = {}): Platform => {
  const { realtimeEndpoint, ...platformOptions } = options
  return createPlatform({
    ...platformOptions,
    runtime: 'bun',
    framework: 'bun',
    deployment: 'persistent',
    realtime:
      platformOptions.realtime ?? sseRealtime({ endpoint: realtimeEndpoint ?? '/realtime' }),
  })
}
