import { describe, expect, it } from 'bun:test'

import { createRakunRevalidateHandler } from '../src/revalidate'

describe('Rakun revalidation handler', () => {
  const handler = createRakunRevalidateHandler({ token: 'test-secret' })

  it('rejects requests without the shared bearer token', async () => {
    const response = await handler(
      new Request('https://example.com/api/revalidate', {
        method: 'POST',
        body: JSON.stringify({ path: '/' }),
      })
    )

    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('validates the path before touching the Next cache', async () => {
    const response = await handler(
      new Request('https://example.com/api/revalidate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: '' }),
      })
    )

    expect(response.status).toBe(400)
  })
})
