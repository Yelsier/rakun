import { createPlatform, type Platform, type PlatformOptions } from '@rakun-kit/core'

export type ExpressPlatformOptions = Omit<PlatformOptions, 'framework'>

export const createExpressPlatform = (options: ExpressPlatformOptions = {}): Platform =>
  createPlatform({
    ...options,
    framework: 'express',
    deployment: options.deployment ?? 'persistent',
  })
