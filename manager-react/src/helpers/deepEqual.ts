export const deepEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true

  if (typeof a !== typeof b) return false

  if (a === null || b === null) return a === b

  if (typeof a !== 'object' || typeof b !== 'object') return false

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((value, index) => deepEqual(value, b[index]))
  }

  const aEntries = Object.entries(a as Record<string, unknown>)
  const bEntries = Object.entries(b as Record<string, unknown>)

  if (aEntries.length !== bEntries.length) return false

  return aEntries.every(([key, value]) => deepEqual(value, (b as Record<string, unknown>)[key]))
}

