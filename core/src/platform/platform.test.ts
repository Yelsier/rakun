import { describe, expect, test } from 'bun:test'

import {
  createPlatform,
  createRealtimeSseStream,
  collaborationRealtimeTopic,
  bunImage,
  detectRuntime,
  hasBunImage,
  pollingRealtime,
  isRealtimeEndpointRequest,
  parseRealtimeTopics,
  parseRealtimePresenceBindings,
  resolveRealtimeEndpointPath,
  sseRealtime,
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
  test('uses an API-relative SSE endpoint by default', () => {
    expect(sseRealtime().metadata).toEqual({
      transport: 'sse',
      endpoint: '/realtime',
    })
  })

  test('parses bounded, unique topics independently of an HTTP adapter', () => {
    expect(
      parseRealtimeTopics(
        'http://localhost/realtime?topic=content%3A1&topic=content%3A1&topic=locales'
      )
    ).toEqual(['content:1', 'locales'])
    expect(parseRealtimeTopics('/realtime?topic=relative')).toEqual(['relative'])
    expect(parseRealtimeTopics('http://localhost/realtime')).toBeNull()
    expect(parseRealtimeTopics(`http://localhost/realtime?topic=${'x'.repeat(2_049)}`)).toBeNull()
  })

  test('parses presence bindings only for topics in the same subscription', () => {
    const topic = collaborationRealtimeTopic('content', 'Page', 'page-1')
    const binding = encodeURIComponent(JSON.stringify([topic, 'tab-1']))
    expect(
      parseRealtimePresenceBindings(
        `/realtime?topic=${encodeURIComponent(topic)}&presence=${binding}`,
        [topic],
      ),
    ).toEqual([{ topic, clientId: 'tab-1' }])
    expect(
      parseRealtimePresenceBindings(
        `http://example.test/realtime?topic=${encodeURIComponent(topic)}` +
          `&presence=${encodeURIComponent(JSON.stringify([topic, 'tab-1']))}` +
          `&presence=${encodeURIComponent(JSON.stringify([topic, 'tab-2']))}`,
        [topic],
      ),
    ).toBeNull()
    expect(
      parseRealtimePresenceBindings(
        `/realtime?topic=${encodeURIComponent(topic)}&presence=${encodeURIComponent(
          JSON.stringify(['another-topic', 'tab-1']),
        )}`,
        [topic],
      ),
    ).toBeNull()
  })

  test('matches configured endpoints independently of the host framework', () => {
    expect(resolveRealtimeEndpointPath('/realtime', '/api/rakun')).toBe('/api/rakun/realtime')
    expect(resolveRealtimeEndpointPath('/api/rakun/events', '/api/rakun')).toBe('/api/rakun/events')
    expect(resolveRealtimeEndpointPath('/realtime?token=test', '/api')).toBe('/api/realtime')
    expect(
      isRealtimeEndpointRequest({
        basePath: '/api',
        endpoint: '/realtime',
        method: 'GET',
        requestUrl: '/api/realtime?topic=content',
      })
    ).toBe(true)
    expect(
      isRealtimeEndpointRequest({
        basePath: '/api',
        endpoint: '/realtime',
        method: 'GET',
        requestUrl: 'http://localhost/api/nested/realtime?topic=content',
      })
    ).toBe(false)
    expect(
      isRealtimeEndpointRequest({
        endpoint: '/api/realtime',
        method: 'POST',
        requestUrl: 'http://localhost/api/realtime',
      })
    ).toBe(false)
  })

  test('publishes only to subscribers of the matching topic', () => {
    let changes = 0
    const realtime = sseRealtime({
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
    const realtime = sseRealtime({ endpoint: '/api/realtime' })
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

  test('streams SSE events through the shared server primitive', async () => {
    const realtime = sseRealtime({ endpoint: '/api/realtime' })
    let closed = 0
    const reader = createRealtimeSseStream({
      heartbeatMs: 60_000,
      lifecycle: { close: () => closed += 1 },
      realtime,
      topics: ['content:1', 'locales'],
    }).getReader()
    const decoder = new TextDecoder()

    expect(decoder.decode((await reader.read()).value)).toBe(': connected\n\n')
    realtime.publish('locales')
    expect(decoder.decode((await reader.read()).value)).toBe('id: 1\ndata: {"topic":"locales"}\n\n')

    await reader.cancel()
    expect(closed).toBe(1)
  })
})
