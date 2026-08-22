import { createPlatform, type Platform, type PlatformOptions } from '@rakun-kit/core'

export type NextPlatformOptions = Omit<PlatformOptions, 'framework'>

export const createNextPlatform = (options: NextPlatformOptions = {}): Platform => {
  return createPlatform({
    ...options,
    framework: 'next',
    deployment: options.deployment ?? 'serverless',
  })
}
