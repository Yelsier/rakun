import { useEffect, useMemo, useRef } from 'react'
import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createRealtimeTopic, type RealtimeMetadata } from '@rakun-kit/core/client'

export interface RealtimeProvider {
  readonly metadata: RealtimeMetadata
  subscribe(topic: string, onChange: () => void, options?: { intervalMs?: number }): () => void
}

const normalizeInterval = (value: number | undefined): number =>
  Number.isFinite(value) && (value ?? 0) >= 250 ? Math.round(value!) : 3_000

export const pollingRealtime = (options: { intervalMs?: number } = {}): RealtimeProvider => {
  const intervalMs = normalizeInterval(options.intervalMs)
  return {
    metadata: { transport: 'polling', intervalMs },
    subscribe(_topic, onChange, subscriptionOptions) {
      const timer = window.setInterval(
        onChange,
        normalizeInterval(subscriptionOptions?.intervalMs ?? intervalMs)
      )
      return () => window.clearInterval(timer)
    },
  }
}

const messageMatchesTopic = (data: unknown, topic: string): boolean => {
  if (typeof data !== 'string') return true
  try {
    const parsed = JSON.parse(data) as { topic?: unknown }
    return parsed.topic === undefined || parsed.topic === topic
  } catch {
    return data === topic
  }
}

const resolveWebSocketUrl = (endpoint: string): string => {
  const url = new URL(endpoint, globalThis.location?.href)
  if (url.protocol === 'http:') url.protocol = 'ws:'
  if (url.protocol === 'https:') url.protocol = 'wss:'
  return url.toString()
}

export const websocketRealtime = (options: { endpoint: string }): RealtimeProvider => ({
  metadata: { transport: 'websocket', endpoint: options.endpoint },
  subscribe(topic, onChange) {
    const separator = options.endpoint.includes('?') ? '&' : '?'
    const socket = new WebSocket(
      resolveWebSocketUrl(`${options.endpoint}${separator}topic=${encodeURIComponent(topic)}`)
    )
    socket.addEventListener('message', (event) => {
      if (messageMatchesTopic(event.data, topic)) onChange()
    })
    return () => socket.close()
  },
})

export const sseRealtime = (options: { endpoint: string }): RealtimeProvider => ({
  metadata: { transport: 'sse', endpoint: options.endpoint },
  subscribe(topic, onChange) {
    const separator = options.endpoint.includes('?') ? '&' : '?'
    const source = new EventSource(
      `${options.endpoint}${separator}topic=${encodeURIComponent(topic)}`,
      { withCredentials: true }
    )
    source.addEventListener('message', (event) => {
      if (messageMatchesTopic(event.data, topic)) onChange()
    })
    return () => source.close()
  },
})

export const realtimeFromMetadata = (metadata: RealtimeMetadata): RealtimeProvider => {
  if (metadata.transport === 'websocket') {
    return websocketRealtime({ endpoint: metadata.endpoint })
  }
  if (metadata.transport === 'sse') {
    return sseRealtime({ endpoint: metadata.endpoint })
  }
  return pollingRealtime({ intervalMs: metadata.intervalMs })
}

export const createSyncTopic = (...parts: Array<string | number | null | undefined>): string =>
  createRealtimeTopic(...parts)

export const resolveRealtimeMetadata = (
  metadata: RealtimeMetadata,
  baseUrl?: string
): RealtimeMetadata => {
  if (metadata.transport === 'polling' || !baseUrl) return metadata
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(metadata.endpoint)) return metadata
  if (metadata.endpoint.startsWith('/')) return metadata

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return { ...metadata, endpoint: `${normalizedBase}/${metadata.endpoint}` }
}

export type UseRealtimeSyncArgs<
  TData,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<TData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'> & {
  key: TQueryKey
  fetcher: (context: { signal: AbortSignal }) => Promise<TData>
  topic?: string
  syncEnabled?: boolean
  syncIntervalMs?: number
  realtime: RealtimeProvider
}

export const useRealtimeSync = <
  TData,
  TError = DefaultError,
  TQueryKey extends QueryKey = QueryKey,
>({
  key,
  fetcher,
  topic,
  syncEnabled,
  syncIntervalMs,
  realtime,
  ...options
}: UseRealtimeSyncArgs<TData, TError, TQueryKey>): UseQueryResult<TData, TError> => {
  const queryClient = useQueryClient()
  const topicKey = useMemo(() => topic ?? JSON.stringify(key), [key, topic])
  const keyRef = useRef(key)
  keyRef.current = key
  const subscriptionEnabled = syncEnabled ?? options.enabled !== false
  const query = useQuery({
    ...options,
    queryKey: key,
    queryFn: fetcher,
  })

  useEffect(() => {
    if (!subscriptionEnabled) return
    return realtime.subscribe(
      topicKey,
      () => {
        void queryClient.invalidateQueries({ queryKey: keyRef.current, exact: true })
      },
      { intervalMs: syncIntervalMs }
    )
  }, [queryClient, realtime, subscriptionEnabled, syncIntervalMs, topicKey])

  return query
}
