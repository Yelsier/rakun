import { describe, expect, test } from 'bun:test'

import { realtimeFromMetadata, resolveRealtimeMetadata, sseRealtime } from './realtime'

describe('realtimeFromMetadata', () => {
  test('creates the transport declared by server metadata', () => {
    expect(
      realtimeFromMetadata({
        transport: 'polling',
        intervalMs: 4_000,
      }).metadata
    ).toEqual({ transport: 'polling', intervalMs: 4_000 })

    expect(
      realtimeFromMetadata({
        transport: 'sse',
        endpoint: '/api/realtime/events',
      }).metadata
    ).toEqual({ transport: 'sse', endpoint: '/api/realtime/events' })
  })

  test('resolves transport endpoints against the manager API base URL', () => {
    expect(resolveRealtimeMetadata(sseRealtime().metadata, '/api/rakun')).toEqual({
      transport: 'sse',
      endpoint: '/api/rakun/realtime',
    })

    expect(
      resolveRealtimeMetadata({ transport: 'sse', endpoint: 'realtime/events' }, '/api/rakun')
    ).toEqual({ transport: 'sse', endpoint: '/api/rakun/realtime/events' })

    expect(
      resolveRealtimeMetadata({ transport: 'sse', endpoint: '/realtime?token=test' }, '/api')
    ).toEqual({ transport: 'sse', endpoint: '/api/realtime?token=test' })

    expect(
      resolveRealtimeMetadata(
        { transport: 'sse', endpoint: '/api/rakun/realtime' },
        'https://cms.example.com/api/rakun'
      )
    ).toEqual({
      transport: 'sse',
      endpoint: 'https://cms.example.com/api/rakun/realtime',
    })
  })

  test('multiplexes SSE topics and refreshes once the connection is ready', async () => {
    const originalEventSource = globalThis.EventSource
    let source: FakeEventSource | undefined
    let sourceCount = 0

    class FakeEventSource {
      closed = false
      listeners = new Map<string, Set<(event?: { data?: string }) => void>>()
      url: string

      constructor(url: string) {
        sourceCount += 1
        source = this
        this.url = url
      }

      addEventListener(name: string, listener: (event?: { data?: string }) => void) {
        const listeners = this.listeners.get(name) ?? new Set<(event?: { data?: string }) => void>()
        listeners.add(listener)
        this.listeners.set(name, listeners)
      }

      emit(name: string, event?: { data?: string }) {
        for (const listener of this.listeners.get(name) ?? []) listener(event)
      }

      close() {
        this.closed = true
      }
    }

    Object.defineProperty(globalThis, 'EventSource', {
      configurable: true,
      value: FakeEventSource,
    })

    try {
      let contentRefreshes = 0
      let localeRefreshes = 0
      const realtime = sseRealtime({ endpoint: '/api/realtime' })
      const unsubscribeContent = realtime.subscribe(
        'content:1',
        () => {
          contentRefreshes += 1
        },
        { presenceClientId: 'tab-1' },
      )
      const unsubscribeLocale = realtime.subscribe('locales:1', () => {
        localeRefreshes += 1
      })

      await Promise.resolve()

      source?.emit('open')
      expect(sourceCount).toBe(1)
      expect(source?.url).toContain('topic=content%3A1')
      expect(source?.url).toContain('topic=locales%3A1')
      expect(source?.url).toContain(
        `presence=${encodeURIComponent(JSON.stringify(['content:1', 'tab-1']))}`,
      )
      expect(contentRefreshes).toBe(1)
      expect(localeRefreshes).toBe(1)

      source?.emit('message', {
        data: JSON.stringify({ topic: 'content:1' }),
      })
      expect(contentRefreshes).toBe(2)
      expect(localeRefreshes).toBe(1)

      const previousSource = source
      const unsubscribeSecondTab = realtime.subscribe(
        'content:1',
        () => undefined,
        { presenceClientId: 'tab-2' },
      )
      await Promise.resolve()
      expect(sourceCount).toBe(2)
      expect(previousSource?.closed).toBe(false)
      source?.emit('open')
      expect(previousSource?.closed).toBe(true)

      unsubscribeContent()
      const sourceWithFirstTab = source
      await Promise.resolve()
      expect(sourceCount).toBe(3)
      expect(sourceWithFirstTab?.closed).toBe(false)
      expect(source?.url).toContain(
        `presence=${encodeURIComponent(JSON.stringify(['content:1', 'tab-2']))}`,
      )
      source?.emit('open')
      expect(sourceWithFirstTab?.closed).toBe(true)

      unsubscribeSecondTab()
      unsubscribeLocale()
      await Promise.resolve()
      expect(source?.closed).toBe(true)
    } finally {
      Object.defineProperty(globalThis, 'EventSource', {
        configurable: true,
        value: originalEventSource,
      })
    }
  })
})
