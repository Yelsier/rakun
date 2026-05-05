import { ObjectId } from 'mongodb'

/**
 * Transform MongoDB ObjectIds to strings recursively in an object
 */
export function transformObjectIdsToStrings<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformObjectIdsToStrings(item)) as T
  }

  if (obj instanceof ObjectId) {
    return obj.toString() as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof ObjectId) {
        result[key] = value.toString()
      } else if (typeof value === 'object' && value !== null) {
        result[key] = transformObjectIdsToStrings(value)
      } else {
        result[key] = value
      }
    }
    return result as T
  }

  return obj
}
