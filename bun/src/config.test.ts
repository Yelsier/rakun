import { expect, test } from 'bun:test'

import { resolveRakunConfig } from './config'

test('resolves bounded production cache defaults', () => {
  const config = resolveRakunConfig({ manager: false })

  expect(config.cache).toEqual({
    assetIdleTimeoutMs: 300_000,
    assetMaxBytes: 32 * 1024 * 1024,
    routeIdleTimeoutMs: 300_000,
    routeMaxBytes: 32 * 1024 * 1024,
    routeMaxEntries: 128,
    routeMaxGenerations: 2,
  })
})

test('accepts disabled memory caches but retains one disk generation', () => {
  const config = resolveRakunConfig({
    cache: {
      assetIdleTimeoutMs: 0,
      assetMaxBytes: 0,
      routeIdleTimeoutMs: 0,
      routeMaxBytes: 0,
      routeMaxEntries: 0,
      routeMaxGenerations: 1,
    },
    manager: false,
  })

  expect(config.cache.assetMaxBytes).toBe(0)
  expect(config.cache.routeMaxEntries).toBe(0)
  expect(config.cache.routeMaxGenerations).toBe(1)
  expect(() => resolveRakunConfig({ cache: { routeMaxGenerations: 0 }, manager: false })).toThrow(
    'cache.routeMaxGenerations'
  )
})
