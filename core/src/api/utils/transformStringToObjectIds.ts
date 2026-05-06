import { getMongoDB } from '../../orm/mongodbPeer'

/**
 * Transform string IDs to MongoDB ObjectIds recursively in an object
 */
export function transformStringToObjectIds<T>(obj: T): T {
  const { ObjectId } = getMongoDB()

  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformStringToObjectIds(item)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Transform _id fields to ObjectId
      if (
        key === '_id' &&
        typeof value === 'string' &&
        ObjectId.isValid(value)
      ) {
        result[key] = new ObjectId(value)
      } else if (typeof value === 'object' && value !== null) {
        result[key] = transformStringToObjectIds(value)
      } else {
        result[key] = value
      }
    }
    return result as T
  }

  return obj
}
