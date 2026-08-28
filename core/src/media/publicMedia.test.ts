import { describe, expect, test } from 'bun:test'

import {
  createMediaService,
  handlePublicMediaRequest,
  type StorageAdapter,
} from './index'

const createAdapter = (
  getPublicObject: NonNullable<StorageAdapter['getPublicObject']>
): StorageAdapter => ({
  createPresignedPut: async ({ key }) => ({ key, url: 'https://example.test/upload' }),
  putObject: async () => {},
  headObject: async () => ({ size: 0 }),
  createPresignedGet: async () => ({
    expiresAt: new Date(),
    url: 'https://example.test/private',
  }),
  deleteObject: async () => {},
  publicUrl: () => null,
  getPublicObject,
})

describe('handlePublicMediaRequest', () => {
  test('streams public media with stable cache headers and range forwarding', async () => {
    const calls: Parameters<NonNullable<StorageAdapter['getPublicObject']>>[0][] = []
    createMediaService({
      adapter: createAdapter(async (input) => {
        calls.push(input)
        return {
          acceptRanges: 'bytes',
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('hello'))
              controller.close()
            },
          }),
          contentLength: 5,
          contentType: 'text/plain',
          etag: '"asset"',
        }
      }),
    })

    const response = await handlePublicMediaRequest({
      request: new Request('https://example.test/media/public/uploads/example.txt', {
        headers: { Range: 'bytes=0-4' },
      }),
      pathSegments: ['uploads', 'example.txt'],
    })

    expect(response?.status).toBe(200)
    expect(await response?.text()).toBe('hello')
    expect(response?.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(response?.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response?.headers.get('Content-Type')).toBe('text/plain')
    expect(calls).toEqual([
      {
        key: 'public/uploads/example.txt',
        method: 'GET',
        range: 'bytes=0-4',
      },
    ])
  })

  test('uses metadata only for HEAD requests and rejects traversal paths', async () => {
    const calls: Parameters<NonNullable<StorageAdapter['getPublicObject']>>[0][] = []
    createMediaService({
      adapter: createAdapter(async (input) => {
        calls.push(input)
        return { contentLength: 5, contentType: 'text/plain' }
      }),
    })

    const head = await handlePublicMediaRequest({
      request: new Request('https://example.test/media/public/uploads/example.txt', {
        method: 'HEAD',
      }),
      pathSegments: ['uploads', 'example.txt'],
    })
    const traversal = await handlePublicMediaRequest({
      request: new Request('https://example.test/media/public/%2E%2E/private.txt'),
      pathSegments: ['..', 'private.txt'],
    })

    expect(head?.status).toBe(200)
    expect(head?.headers.get('Content-Length')).toBe('5')
    expect(await head?.text()).toBe('')
    expect(traversal?.status).toBe(404)
    expect(calls).toEqual([
      {
        key: 'public/uploads/example.txt',
        method: 'HEAD',
        range: undefined,
      },
    ])
  })
})
