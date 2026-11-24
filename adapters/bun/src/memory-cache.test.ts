import { expect, test } from 'bun:test'

import { BoundedMemoryCache } from './memory-cache'

test('evicts least-recently-used entries by count and bytes', () => {
  let now = 0
  const cache = new BoundedMemoryCache<string, string>({
    idleTimeoutMs: 0,
    maxBytes: 6,
    maxEntries: 2,
    now: () => now,
    sizeOf: (value) => value.length,
  })

  cache.set('first', '11')
  cache.set('second', '22')
  now += 1
  expect(cache.get('first')).toBe('11')
  cache.set('third', '333')

  expect(cache.get('second')).toBeUndefined()
  expect(cache.get('first')).toBe('11')
  expect(cache.get('third')).toBe('333')
  expect(cache.byteSize).toBe(5)
})

test('purges entries after their idle timeout', () => {
  let now = 0
  const cache = new BoundedMemoryCache<string, string>({
    idleTimeoutMs: 100,
    maxBytes: 100,
    maxEntries: 10,
    now: () => now,
    sizeOf: (value) => value.length,
  })

  cache.set('route', 'response')
  now = 99
  expect(cache.get('route')).toBe('response')
  now = 200
  expect(cache.purgeExpired()).toBe(1)
  expect(cache.size).toBe(0)
})

test('does not retain entries larger than the byte budget', () => {
  const cache = new BoundedMemoryCache<string, Uint8Array>({
    idleTimeoutMs: 1_000,
    maxBytes: 4,
    maxEntries: 10,
    sizeOf: (value) => value.byteLength,
  })

  cache.set('large', new Uint8Array(5))
  expect(cache.size).toBe(0)
})
