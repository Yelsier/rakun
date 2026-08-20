import { createPlatform, sseRealtime, type Platform, type PlatformOptions } from '@rakun-kit/core'

export type NextPlatformOptions = Omit<PlatformOptions, 'framework'>

export const createNextPlatform = (options: NextPlatformOptions = {}): Platform => {
  const deployment = options.deployment ?? 'serverless'
  return createPlatform({
    ...options,
    framework: 'next',
    deployment,
    realtime:
      options.realtime ??
      (deployment === 'persistent' ? sseRealtime({ endpoint: 'realtime/events' }) : undefined),
  })
}
