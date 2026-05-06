import { getMongoDB } from '../mongodbPeer'

export function transformStringToObjectIds<T>(obj: T): T {
  const { ObjectId } = getMongoDB()

  if (typeof obj === 'string' && ObjectId.isValid(obj)) {
    return new ObjectId(obj) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformStringToObjectIds(item)) as unknown as T
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const newObj: Record<string, unknown> = {}
    for (const key in obj) {
      newObj[key] = transformStringToObjectIds(obj[key]) as unknown
    }
    return newObj as T
  }

  return obj
}
