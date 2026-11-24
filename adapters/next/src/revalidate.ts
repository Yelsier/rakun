import { timingSafeEqual } from 'node:crypto'

import { revalidatePath, revalidateTag } from 'next/cache'

import { RAKUN_STATIC_PATHS_CACHE_TAG } from './web-cache'

export type CreateRakunRevalidateHandlerOptions = {
  token: string
}

const jsonResponse = (status: number, body: unknown) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })

const isAuthorized = (request: Request, token: string): boolean => {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return false

  const received = Buffer.from(authorization.slice('Bearer '.length))
  const expected = Buffer.from(token)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

const normalizeRevalidatePath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 1024) return null

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export const createRakunRevalidateHandler = ({ token }: CreateRakunRevalidateHandlerOptions) => {
  if (!token.trim()) {
    throw new Error('createRakunRevalidateHandler requires a non-empty token.')
  }

  return async (request: Request): Promise<Response> => {
    if (!isAuthorized(request, token)) {
      return jsonResponse(401, { revalidated: false })
    }

    const body = await request.json().catch(() => null)
    const path = normalizeRevalidatePath(
      body && typeof body === 'object' && 'path' in body
        ? (body as { path?: unknown }).path
        : undefined
    )
    if (!path) {
      return jsonResponse(400, {
        revalidated: false,
        message: 'A valid path is required.',
      })
    }

    revalidateTag(RAKUN_STATIC_PATHS_CACHE_TAG, { expire: 0 })
    revalidatePath(path)

    return jsonResponse(200, {
      revalidated: true,
      path,
    })
  }
}
