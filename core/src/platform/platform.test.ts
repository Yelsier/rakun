import { describe, expect, test } from 'bun:test'

import {
  createPlatform,
  bunImage,
  detectRuntime,
  hasBunImage,
  pollingRealtime,
  websocketRealtime,
} from './index'
import type {
  CompressionProvider,
  CryptoProvider,
  FilesystemProvider,
  ImageProcessor,
  WorkersProvider,
} from './types'

const image: ImageProcessor = {
  id: 'test-image',
  metadata: async () => ({ width: 1, height: 1 }),
  transform: async (input) => input,
}

const crypto: CryptoProvider = {
  randomBytes: (size) => new Uint8Array(size),
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
  hash: () => 'hash',
  hmac: () => 'hmac',
  timingSafeEqual: (left, right) => left.length === right.length,
}

const filesystem: FilesystemProvider = {
  makeTemporaryDirectory: async () => '/tmp/rakun',
  readFile: async () => new Uint8Array(),
  writeFile: async () => undefined,
  remove: async () => undefined,
}

const compression: CompressionProvider = {
  gzip: async (input) => input,
  gunzip: async (input) => input,
}

const workers: WorkersProvider = {
  runProcess: async () => ({ exitCode: 0, stderr: '' }),
}

describe('platform resolution', () => {
  test('detects the current runtime centrally', () => {
    expect(detectRuntime()).toBe(process.versions.bun ? 'bun' : 'node')
  })

  test('keeps runtime, framework, and deployment independent', () => {
    const platform = createPlatform({
      runtime: 'node',
      framework: 'next',
      deployment: 'persistent',
      image,
      realtime: pollingRealtime({ intervalMs: 4_000 }),
      crypto,
      filesystem,
      compression,
      workers,
    })

    expect(platform.runtime).toBe('node')
    expect(platform.framework).toBe('next')
    expect(platform.deployment).toBe('persistent')
    expect(platform.image).toBe(image)
    expect(platform.realtime.metadata).toEqual({
      transport: 'polling',
      intervalMs: 4_000,
    })
  })

  test('uses the Bun image adapter for supported output formats', async () => {
    if (!hasBunImage()) return

    const source = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
    const processor = bunImage()

    for (const format of ['jpeg', 'png', 'webp', 'avif'] as const) {
      const output = await processor.transform(source, {
        format,
        quality: 80,
      })
      expect(output.byteLength).toBeGreaterThan(0)
    }
  })
})

describe('realtime adapters', () => {
  test('publishes only to subscribers of the matching topic', () => {
    let changes = 0
    const realtime = websocketRealtime({
      endpoint: '/api/realtime',
    })

    const unsubscribe = realtime.subscribe('content:1', () => {
      changes += 1
    })
    realtime.publish('content:2')
    realtime.publish('content:1')
    unsubscribe()
    realtime.publish('content:1')

    expect(changes).toBe(1)
  })

  test('isolates subscribers when one connection is stale', () => {
    const realtime = websocketRealtime({ endpoint: '/api/realtime' })
    let changes = 0
    realtime.subscribe('content:1', () => {
      throw new Error('closed stream')
    })
    realtime.subscribe('content:1', () => {
      changes += 1
    })

    expect(() => realtime.publish('content:1')).not.toThrow()
    expect(changes).toBe(1)
  })
})
