import {
  type DefaultError,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import {
  createRealtimeTopic,
  DEFAULT_SSE_ENDPOINT,
  type RealtimeMetadata,
} from '@rakun-kit/core/client'

const RELATIVE_URL_BASE = 'http://rakun.local'

export interface RealtimeProvider {
  readonly metadata: RealtimeMetadata
  subscribe(
    topic: string,
    onChange: () => void,
    options?: { intervalMs?: number; presenceClientId?: string },
  ): () => void
}

const normalizeInterval = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 250 ? Math.round(value) : 3_000

export const pollingRealtime = (options: { intervalMs?: number } = {}): RealtimeProvider => {
  const intervalMs = normalizeInterval(options.intervalMs)

  return {
    metadata: { transport: 'polling', intervalMs },
    subscribe(_topic, onChange, subscriptionOptions) {
      const timer = globalThis.setInterval(
        onChange,
        normalizeInterval(subscriptionOptions?.intervalMs ?? intervalMs)
      )
      return () => globalThis.clearInterval(timer)
    },
  }
}

export const sseRealtime = (options: { endpoint?: string } = {}): RealtimeProvider => {
  const endpoint = options.endpoint ?? DEFAULT_SSE_ENDPOINT
  type Listener = {
    onChange: () => void
    presenceClientId?: string
  }
  const listeners = new Map<string, Set<Listener>>()
  let source: EventSource | undefined
  const sources = new Set<EventSource>()
  let connectionScheduled = false

  const notifyAll = () => {
    for (const topicListeners of listeners.values()) {
      for (const listener of topicListeners) listener.onChange()
    }
  }

  const connect = () => {
    if (listeners.size === 0) {
      for (const currentSource of sources) currentSource.close()
      sources.clear()
      source = undefined
      return
    }

    const separator = endpoint.includes('?') ? '&' : '?'
    const topicQuery = [...listeners.keys()]
      .map((topic) => `topic=${encodeURIComponent(topic)}`)
      .join('&')
    const presenceQuery = [...listeners.entries()]
      .map(([topic, topicListeners]) => {
        const listener = [...topicListeners].find(
          (current): current is Listener & { presenceClientId: string } =>
            Boolean(current.presenceClientId),
        )
        return listener ? JSON.stringify([topic, listener.presenceClientId]) : null
      })
      .filter((binding): binding is string => binding !== null)
      .map((binding) => `presence=${encodeURIComponent(binding)}`)
      .join('&')
    const query = presenceQuery ? `${topicQuery}&${presenceQuery}` : topicQuery
    const nextSource = new EventSource(`${endpoint}${separator}${query}`, {
      withCredentials: true,
    })
    source = nextSource
    sources.add(nextSource)
    nextSource.addEventListener('open', () => {
      if (source !== nextSource) {
        nextSource.close()
        sources.delete(nextSource)
        return
      }
      for (const currentSource of sources) {
        if (currentSource === nextSource) continue
        currentSource.close()
        sources.delete(currentSource)
      }
      notifyAll()
    })
    nextSource.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        notifyAll()
        return
      }

      try {
        const parsed: unknown = JSON.parse(event.data)
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'topic' in parsed &&
          typeof parsed.topic === 'string'
        ) {
          for (const listener of listeners.get(parsed.topic) ?? []) {
            listener.onChange()
          }
          return
        }
      } catch {
        for (const listener of listeners.get(event.data) ?? []) {
          listener.onChange()
        }
        return
      }

      notifyAll()
    })
  }

  const scheduleConnection = () => {
    if (connectionScheduled) return

    connectionScheduled = true
    queueMicrotask(() => {
      connectionScheduled = false
      connect()
    })
  }

  return {
    metadata: { transport: 'sse', endpoint },
    subscribe(topic, onChange, subscriptionOptions) {
      const listener: Listener = {
        onChange,
        presenceClientId: subscriptionOptions?.presenceClientId,
      }
      const topicListeners = listeners.get(topic) ?? new Set<Listener>()
      topicListeners.add(listener)
      listeners.set(topic, topicListeners)
      scheduleConnection()

      return () => {
        topicListeners.delete(listener)
        if (topicListeners.size === 0) listeners.delete(topic)
        scheduleConnection()
      }
    },
  }
}

export const realtimeFromMetadata = (metadata: RealtimeMetadata): RealtimeProvider => {
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

  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const absoluteBase = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedBase)
    ? new URL(normalizedBase)
    : undefined
  const endpointUrl = new URL(metadata.endpoint, RELATIVE_URL_BASE)
  const normalizedEndpoint = `/${endpointUrl.pathname.split('/').filter(Boolean).join('/')}`
  const basePath = absoluteBase ? absoluteBase.pathname.replace(/\/+$/, '') : normalizedBase
  const endpointAlreadyIncludesBase =
    normalizedEndpoint === basePath || normalizedEndpoint.startsWith(`${basePath}/`)
  const endpointPath = endpointAlreadyIncludesBase
    ? normalizedEndpoint
    : `${basePath}${normalizedEndpoint}`

  return {
    ...metadata,
    endpoint: `${absoluteBase ? absoluteBase.origin : ''}${endpointPath}${endpointUrl.search}${endpointUrl.hash}`,
  }
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
  presenceClientId?: string
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
  presenceClientId,
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
        void queryClient.invalidateQueries({
          queryKey: keyRef.current,
          exact: true,
        })
      },
      { intervalMs: syncIntervalMs, presenceClientId }
    )
  }, [presenceClientId, queryClient, realtime, subscriptionEnabled, syncIntervalMs, topicKey])

  return query
}
