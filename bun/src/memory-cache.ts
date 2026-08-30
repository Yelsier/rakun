type MemoryCacheEntry<Value> = {
  lastAccessAt: number
  size: number
  value: Value
}

export type BoundedMemoryCacheOptions<Value> = {
  idleTimeoutMs: number
  maxBytes: number
  maxEntries: number
  now?: () => number
  sizeOf?: (value: Value) => number
}

const assertNonNegativeInteger = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer.`)
  }
}

export class BoundedMemoryCache<Key, Value> {
  private readonly entries = new Map<Key, MemoryCacheEntry<Value>>()
  private readonly idleTimeoutMs: number
  private readonly maxBytes: number
  private readonly maxEntries: number
  private readonly now: () => number
  private readonly sizeOf: (value: Value) => number
  private cleanupTimer?: ReturnType<typeof setTimeout>
  private retainedBytes = 0

  constructor(options: BoundedMemoryCacheOptions<Value>) {
    assertNonNegativeInteger('idleTimeoutMs', options.idleTimeoutMs)
    assertNonNegativeInteger('maxBytes', options.maxBytes)
    assertNonNegativeInteger('maxEntries', options.maxEntries)
    this.idleTimeoutMs = options.idleTimeoutMs
    this.maxBytes = options.maxBytes
    this.maxEntries = options.maxEntries
    this.now = options.now ?? Date.now
    this.sizeOf = options.sizeOf ?? (() => 1)
  }

  get size(): number {
    return this.entries.size
  }

  get byteSize(): number {
    return this.retainedBytes
  }

  get(key: Key): Value | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined

    const now = this.now()
    if (this.isExpired(entry, now)) {
      this.delete(key)
      return undefined
    }

    entry.lastAccessAt = now
    this.entries.delete(key)
    this.entries.set(key, entry)
    this.scheduleCleanup()
    return entry.value
  }

  has(key: Key): boolean {
    return this.get(key) !== undefined
  }

  set(key: Key, value: Value): void {
    this.delete(key)
    if (this.maxEntries === 0 || this.maxBytes === 0) return

    const size = Math.max(0, Math.ceil(this.sizeOf(value)))
    if (!Number.isSafeInteger(size) || size > this.maxBytes) return

    this.entries.set(key, { lastAccessAt: this.now(), size, value })
    this.retainedBytes += size
    this.enforceLimits()
    this.scheduleCleanup()
  }

  delete(key: Key): boolean {
    const entry = this.entries.get(key)
    if (!entry) return false
    this.entries.delete(key)
    this.retainedBytes -= entry.size
    if (this.entries.size === 0) this.cancelCleanup()
    return true
  }

  purgeExpired(): number {
    if (this.idleTimeoutMs === 0) return 0
    const now = this.now()
    let purged = 0
    for (const [key, entry] of this.entries) {
      if (!this.isExpired(entry, now)) continue
      this.entries.delete(key)
      this.retainedBytes -= entry.size
      purged += 1
    }
    this.scheduleCleanup()
    return purged
  }

  clear(): void {
    this.entries.clear()
    this.retainedBytes = 0
    this.cancelCleanup()
  }

  dispose(): void {
    this.clear()
  }

  private isExpired(entry: MemoryCacheEntry<Value>, now: number): boolean {
    return this.idleTimeoutMs > 0 && now - entry.lastAccessAt >= this.idleTimeoutMs
  }

  private enforceLimits(): void {
    while (this.entries.size > this.maxEntries || this.retainedBytes > this.maxBytes) {
      const oldest = this.entries.keys().next()
      if (oldest.done) break
      this.delete(oldest.value)
    }
  }

  private scheduleCleanup(): void {
    this.cancelCleanup()
    if (this.idleTimeoutMs === 0 || this.entries.size === 0) return

    let nextExpiry = Number.POSITIVE_INFINITY
    for (const entry of this.entries.values()) {
      nextExpiry = Math.min(nextExpiry, entry.lastAccessAt + this.idleTimeoutMs)
    }
    this.cleanupTimer = setTimeout(() => this.purgeExpired(), Math.max(1, nextExpiry - this.now()))
    this.cleanupTimer.unref?.()
  }

  private cancelCleanup(): void {
    if (!this.cleanupTimer) return
    clearTimeout(this.cleanupTimer)
    this.cleanupTimer = undefined
  }
}
