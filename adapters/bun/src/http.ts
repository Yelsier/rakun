import type { CookieOptions } from '@rakun-kit/core'

export const headersToObject = (headers: Headers): Record<string, string | string[] | undefined> =>
  Object.fromEntries(headers.entries())

const serializeCookie = (name: string, value: string, options: CookieOptions = {}): string => {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`)
  }
  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`)
  }
  return parts.join('; ')
}

export const createResponseHeaderAdapter = (headers: Headers) => ({
  setHeader(name: string, value: string | string[]) {
    if (Array.isArray(value)) {
      headers.delete(name)
      for (const part of value) headers.append(name, part)
    } else {
      headers.set(name, value)
    }
  },
  cookie(name: string, value: string, options?: CookieOptions) {
    headers.append('Set-Cookie', serializeCookie(name, value, options))
  },
})

export const searchParamsToObject = (url: URL): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {}
  for (const [key, value] of url.searchParams) {
    const current = result[key]
    if (current === undefined) result[key] = value
    else if (Array.isArray(current)) current.push(value)
    else result[key] = [current, value]
  }
  return result
}

export const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...Object.fromEntries(new Headers(headers).entries()),
    },
  })
