import type { RealtimeMetadata, RealtimeProvider } from './types'

const normalizeInterval = (value: number | undefined): number =>
  Number.isFinite(value) && (value ?? 0) >= 250 ? Math.round(value!) : 3_000

const eventRealtime = (metadata: RealtimeMetadata): RealtimeProvider => {
  const listeners = new Map<string, Set<() => void>>()

  return {
    metadata,
    subscribe(topic, onChange) {
      const topicListeners = listeners.get(topic) ?? new Set<() => void>()
      topicListeners.add(onChange)
      listeners.set(topic, topicListeners)

      return () => {
        topicListeners.delete(onChange)
        if (topicListeners.size === 0) listeners.delete(topic)
      }
    },
    publish(topic) {
      for (const listener of listeners.get(topic) ?? []) {
        try {
          listener()
        } catch {
          // A stale connection must not block other subscribers or the mutation.
        }
      }
    },
  }
}

export const pollingRealtime = (options: { intervalMs?: number } = {}): RealtimeProvider => {
  const intervalMs = normalizeInterval(options.intervalMs)
  return {
    metadata: { transport: 'polling', intervalMs },
    subscribe(_topic, onChange, subscriptionOptions) {
      const timer = setInterval(
        onChange,
        normalizeInterval(subscriptionOptions?.intervalMs ?? intervalMs)
      )
      return () => clearInterval(timer)
    },
    publish() {
      // Polling consumers discover changes on their next scheduled refresh.
    },
  }
}

export const websocketRealtime = (options: { endpoint: string }): RealtimeProvider =>
  eventRealtime({ transport: 'websocket', endpoint: options.endpoint })

export const sseRealtime = (options: { endpoint: string }): RealtimeProvider =>
  eventRealtime({ transport: 'sse', endpoint: options.endpoint })

export const realtimeFromMetadata = (metadata: RealtimeMetadata): RealtimeProvider => {
  if (metadata.transport === 'websocket') {
    return websocketRealtime({ endpoint: metadata.endpoint })
  }
  if (metadata.transport === 'sse') {
    return sseRealtime({ endpoint: metadata.endpoint })
  }
  return pollingRealtime({ intervalMs: metadata.intervalMs })
}
