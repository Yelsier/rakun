import { describe, expect, it } from 'bun:test'

import type { RealtimeProvider } from '@rakun-kit/core'

import { createRakunSseStream, isRakunSseRequest } from '../src/realtime'

const createRealtimeProvider = () => {
  const listeners = new Map<string, Set<() => void>>()
  let unsubscribeCount = 0

  const provider: RealtimeProvider = {
    metadata: {
      transport: 'sse',
      endpoint: '/api/realtime',
    },
    subscribe(topic, onChange) {
      const topicListeners = listeners.get(topic) ?? new Set<() => void>()
      topicListeners.add(onChange)
      listeners.set(topic, topicListeners)

      return () => {
        unsubscribeCount += 1
        topicListeners.delete(onChange)
      }
    },
    publish(topic) {
      for (const listener of listeners.get(topic) ?? []) listener()
    },
  }

  return {
    provider,
    getUnsubscribeCount: () => unsubscribeCount,
  }
}

describe('Rakun Next realtime', () => {
  it('matches the SSE endpoint declared by bootstrap metadata', () => {
    expect(
      isRakunSseRequest(
        new Request('http://localhost:3000/api/realtime?topic=content'),
        '/realtime',
        '/api'
      )
    ).toBe(true)
    expect(
      isRakunSseRequest(
        new Request('http://localhost:3000/api/nested/realtime?topic=content'),
        '/realtime',
        '/api'
      )
    ).toBe(false)
    expect(
      isRakunSseRequest(
        new Request('http://localhost:3000/api/realtime?topic=content'),
        'https://cms.example.com/api/realtime'
      )
    ).toBe(true)
    expect(
      isRakunSseRequest(new Request('http://localhost:3000/api/health'), '/api/realtime')
    ).toBe(false)
    expect(
      isRakunSseRequest(
        new Request('http://localhost:3000/api/realtime', { method: 'POST' }),
        '/api/realtime'
      )
    ).toBe(false)
  })

  it('streams matching topic changes and unsubscribes on cancellation', async () => {
    const { provider, getUnsubscribeCount } = createRealtimeProvider()
    const stream = createRakunSseStream({
      heartbeatMs: 60_000,
      realtime: provider,
      topic: 'content:1',
    })
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    expect(decoder.decode((await reader.read()).value)).toBe(': connected\n\n')

    provider.publish('content:2')
    provider.publish('content:1')

    expect(decoder.decode((await reader.read()).value)).toBe(
      'id: 1\ndata: {"topic":"content:1"}\n\n'
    )

    await reader.cancel()
    expect(getUnsubscribeCount()).toBe(1)
  })

  it('multiplexes multiple topics over one SSE stream', async () => {
    const { provider, getUnsubscribeCount } = createRealtimeProvider()
    const reader = createRakunSseStream({
      heartbeatMs: 60_000,
      realtime: provider,
      topics: ['content:1', 'locales:1'],
    }).getReader()
    const decoder = new TextDecoder()

    await reader.read()
    provider.publish('locales:1')

    expect(decoder.decode((await reader.read()).value)).toBe(
      'id: 1\ndata: {"topic":"locales:1"}\n\n'
    )

    await reader.cancel()
    expect(getUnsubscribeCount()).toBe(2)
  })

  it('closes immediately when the request is already aborted', async () => {
    const { provider, getUnsubscribeCount } = createRealtimeProvider()
    const controller = new AbortController()
    controller.abort()

    const reader = createRakunSseStream({
      realtime: provider,
      signal: controller.signal,
      topic: 'content:1',
    }).getReader()

    expect(await reader.read()).toEqual({ done: true, value: undefined })
    expect(getUnsubscribeCount()).toBe(1)
  })
})
