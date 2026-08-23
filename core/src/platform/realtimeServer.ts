import type { RealtimeProvider } from './types'

const DEFAULT_HEARTBEAT_MS = 15_000
const MAX_TOPIC_LENGTH = 2_048
const MAX_TOPICS = 64
const MAX_PRESENCE_CLIENT_ID_LENGTH = 128
const REQUEST_URL_BASE = 'http://rakun.local'

export type RealtimePresenceBinding = {
  topic: string
  clientId: string
}

export type RealtimeSubscriptionLifecycle = {
  heartbeat?: () => void
  close?: () => void
}

const parseRequestUrl = (value: string | URL): URL =>
  value instanceof URL ? value : new URL(value, REQUEST_URL_BASE)

export const parseRealtimeTopics = (requestUrl: string | URL): string[] | null => {
  const topics = parseRequestUrl(requestUrl)
    .searchParams.getAll('topic')
    .map((topic) => topic.trim())
    .filter((topic, index, values) => topic.length > 0 && values.indexOf(topic) === index)

  if (
    topics.length === 0 ||
    topics.length > MAX_TOPICS ||
    topics.some((topic) => topic.length > MAX_TOPIC_LENGTH)
  ) {
    return null
  }

  return topics
}

export const parseRealtimePresenceBindings = (
  requestUrl: string | URL,
  topics: readonly string[],
): RealtimePresenceBinding[] | null => {
  const values = parseRequestUrl(requestUrl).searchParams.getAll('presence')
  const bindings: RealtimePresenceBinding[] = []

  for (const value of values) {
    try {
      const binding: unknown = JSON.parse(value)
      if (
        !Array.isArray(binding) ||
        binding.length !== 2 ||
        typeof binding[0] !== 'string' ||
        !topics.includes(binding[0]) ||
        typeof binding[1] !== 'string' ||
        !binding[1] ||
        binding[1].length > MAX_PRESENCE_CLIENT_ID_LENGTH
      ) {
        return null
      }
      if (bindings.some((current) => current.topic === binding[0])) return null
      bindings.push({ topic: binding[0], clientId: binding[1] })
    } catch {
      return null
    }
  }

  return bindings
}

const normalizePath = (value: string): string => {
  const segments = value.split('/').filter(Boolean)
  return segments.length > 0 ? `/${segments.join('/')}` : ''
}

export const resolveRealtimeEndpointPath = (endpoint: string, basePath = ''): string => {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(endpoint)) {
    return new URL(endpoint).pathname
  }

  const normalizedEndpoint = normalizePath(parseRequestUrl(endpoint).pathname)
  const normalizedBasePath = normalizePath(basePath)
  if (
    !normalizedBasePath ||
    normalizedEndpoint === normalizedBasePath ||
    normalizedEndpoint.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedEndpoint
  }

  return `${normalizedBasePath}${normalizedEndpoint}`
}

export const isRealtimeEndpointRequest = ({
  basePath,
  endpoint,
  method,
  requestUrl,
}: {
  basePath?: string
  endpoint: string
  method: string
  requestUrl: string | URL
}): boolean => {
  if (method !== 'GET') return false

  const resolvedRequestUrl = parseRequestUrl(requestUrl)
  return resolvedRequestUrl.pathname === resolveRealtimeEndpointPath(endpoint, basePath)
}

export const createRealtimeSseStream = ({
  heartbeatMs = DEFAULT_HEARTBEAT_MS,
  realtime,
  signal,
  lifecycle,
  topics,
}: {
  heartbeatMs?: number
  realtime: RealtimeProvider
  signal?: AbortSignal
  lifecycle?: RealtimeSubscriptionLifecycle
  topics: readonly string[]
}): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder()
  const normalizedHeartbeatMs = Number.isFinite(heartbeatMs)
    ? Math.max(1_000, heartbeatMs)
    : DEFAULT_HEARTBEAT_MS
  let cleanup: () => void = () => undefined
  let sequence = 0

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true
      const send = (topic: string) => {
        if (!active) return

        sequence += 1
        controller.enqueue(
          encoder.encode(`id: ${sequence}\ndata: ${JSON.stringify({ topic })}\n\n`)
        )
      }
      const unsubscribers = topics.map((topic) => realtime.subscribe(topic, () => send(topic)))
      const heartbeat = setInterval(() => {
        if (active) {
          lifecycle?.heartbeat?.()
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        }
      }, normalizedHeartbeatMs)
      let abort: () => void
      const close = () => {
        if (!active) return

        active = false
        clearInterval(heartbeat)
        for (const unsubscribe of unsubscribers) unsubscribe()
        lifecycle?.close?.()
        signal?.removeEventListener('abort', abort)
      }
      abort = () => {
        close()
        controller.close()
      }

      cleanup = close
      if (signal?.aborted) {
        abort()
        return
      }
      signal?.addEventListener('abort', abort, { once: true })
      controller.enqueue(encoder.encode(': connected\n\n'))
    },
    cancel() {
      cleanup()
    },
  })
}
