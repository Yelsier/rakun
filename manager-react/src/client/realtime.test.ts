import { describe, expect, test } from 'bun:test'

import { realtimeFromMetadata, resolveRealtimeMetadata } from './realtime'

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

    expect(
      realtimeFromMetadata({
        transport: 'websocket',
        endpoint: 'wss://example.com/realtime',
      }).metadata
    ).toEqual({
      transport: 'websocket',
      endpoint: 'wss://example.com/realtime',
    })
  })

  test('resolves transport endpoints against the manager API base URL', () => {
    expect(
      resolveRealtimeMetadata(
        { transport: 'sse', endpoint: 'realtime/events' },
        '/api/rakun'
      )
    ).toEqual({ transport: 'sse', endpoint: '/api/rakun/realtime/events' })

    expect(
      resolveRealtimeMetadata(
        { transport: 'websocket', endpoint: 'wss://example.com/realtime' },
        '/api/rakun'
      )
    ).toEqual({ transport: 'websocket', endpoint: 'wss://example.com/realtime' })
  })
})
