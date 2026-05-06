import { getMongoDB } from '../mongodbPeer'

export function transformObjectIdsToStrings<T>(obj: T): T {
  const { ObjectId } = getMongoDB()

  if (obj instanceof ObjectId) {
    return obj.toString() as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformObjectIdsToStrings(item)) as unknown as T
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: Record<string, unknown> = {}
    for (const key in obj) {
      newObj[key] = transformObjectIdsToStrings(obj[key]) as unknown
    }
    return newObj as T
  }

  return obj
}
