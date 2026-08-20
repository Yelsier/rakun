import * as Y from 'yjs'

export const CONTENT_ROOT_NAME = 'content'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toYValue = (value: unknown): unknown => {
  if (typeof value === 'string') return new Y.Text(value)
  if (Array.isArray(value)) {
    const result = new Y.Array<unknown>()
    if (value.length) result.insert(0, value.map(toYValue))
    return result
  }
  if (isRecord(value)) {
    const result = new Y.Map<unknown>()
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) result.set(key, toYValue(item))
    }
    return result
  }
  return value
}

const updateText = (target: Y.Text, value: string) => {
  const current = target.toString()
  if (current === value) return

  let prefix = 0
  while (prefix < current.length && prefix < value.length && current[prefix] === value[prefix]) {
    prefix += 1
  }

  let suffix = 0
  while (
    suffix < current.length - prefix &&
    suffix < value.length - prefix &&
    current[current.length - suffix - 1] === value[value.length - suffix - 1]
  ) {
    suffix += 1
  }

  const removed = current.length - prefix - suffix
  const inserted = value.slice(prefix, value.length - suffix)
  if (removed) target.delete(prefix, removed)
  if (inserted) target.insert(prefix, inserted)
}

const updateYValue = (current: unknown, value: unknown): unknown => {
  if (current instanceof Y.Text && typeof value === 'string') {
    updateText(current, value)
    return current
  }
  if (current instanceof Y.Map && isRecord(value)) {
    for (const key of Array.from(current.keys())) {
      if (!(key in value) || value[key] === undefined) current.delete(key)
    }
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue
      const previous = current.get(key)
      const next = updateYValue(previous, item)
      if (next !== previous) current.set(key, next)
    }
    return current
  }
  if (current instanceof Y.Array && Array.isArray(value)) {
    const sharedLength = Math.min(current.length, value.length)
    for (let index = 0; index < sharedLength; index += 1) {
      const previous = current.get(index)
      const next = updateYValue(previous, value[index])
      if (next !== previous) {
        current.delete(index, 1)
        current.insert(index, [next])
      }
    }
    if (current.length > value.length) {
      current.delete(value.length, current.length - value.length)
    } else if (value.length > current.length) {
      current.insert(current.length, value.slice(current.length).map(toYValue))
    }
    return current
  }
  return toYValue(value)
}

export const setContentField = (doc: Y.Doc, field: string, value: unknown, origin: unknown) => {
  const root = doc.getMap<unknown>(CONTENT_ROOT_NAME)
  doc.transact(() => {
    if (value === undefined) root.delete(field)
    else {
      const previous = root.get(field)
      const next = updateYValue(previous, value)
      if (next !== previous) root.set(field, next)
    }
  }, origin)
}

export const getContentSnapshot = (doc: Y.Doc): Record<string, unknown> =>
  doc.getMap<unknown>(CONTENT_ROOT_NAME).toJSON() as Record<string, unknown>
