import { describe, expect, test } from 'bun:test'

import { replaceMediaFile, uploadFileToPresignedUrl } from './media'

describe('media upload file names', () => {
  test('sends Unicode file names through ASCII-only upload headers', async () => {
    const fileName = 'diseño 東京 😀.png'
    let requestHeaders: Headers | undefined
    const fetchImpl = (async (_input, init) => {
      requestHeaders = new Headers(init?.headers)
      return Response.json({
        key: 'public/uploads/file.png',
        access: 'public',
        size: 1,
        mime: 'image/png',
        fileName,
        optimized: false,
        originalSize: 1,
      })
    }) as typeof fetch

    await uploadFileToPresignedUrl({
      file: new File([new Uint8Array([1])], fileName, { type: 'image/png' }),
      prepared: {
        url: '/media/upload',
        key: 'public/uploads/file.png',
        access: 'public',
        uploadToken: 'upload-token',
      },
      apiBase: 'http://localhost',
      fetchImpl,
    })

    expect(requestHeaders?.get('x-cms-upload-file-name')).toBe(
      encodeURIComponent(fileName),
    )
    expect(requestHeaders?.get('x-cms-upload-file-name-encoding')).toBe(
      'uri-component-v1',
    )
  })
})

describe('media replacement', () => {
  test('uploads a new image and replaces the existing media record', async () => {
    const requests: Array<{ name: string; input: unknown }> = []
    const mediaClient = {
      request: async (name: string, input: unknown) => {
        requests.push({ name, input })
        if (name === 'manager.media.prepareUpload') {
          return {
            url: '/media/upload',
            key: 'public/uploads/replacement.png',
            access: 'public',
            uploadToken: 'replacement-token',
          }
        }
        if (name === 'manager.media.replace') {
          return {
            _id: 'media-id',
            _type: 'Media',
            name: 'Hero',
            originalName: 'replacement.png',
            key: 'public/uploads/replacement.png',
            access: 'public',
            mime: 'image/png',
            size: 1,
            uploadedAt: new Date(),
            status: 'uploaded',
          }
        }
        throw new Error(`Unexpected operation: ${name}`)
      },
    }
    const fetchImpl = (async () =>
      Response.json({
        key: 'public/uploads/replacement.png',
        access: 'public',
        size: 1,
        mime: 'image/png',
        fileName: 'replacement.png',
        optimized: false,
        originalSize: 1,
      })) as typeof fetch

    const result = await replaceMediaFile(
      {
        id: 'media-id',
        file: new File([new Uint8Array([1])], 'replacement.png', {
          type: 'image/png',
        }),
        access: 'public',
        apiBase: 'http://localhost',
        fetchImpl,
      },
      mediaClient as never,
    )

    expect(result._id).toBe('media-id')
    expect(requests.map((request) => request.name)).toEqual([
      'manager.media.prepareUpload',
      'manager.media.replace',
    ])
    expect(requests[1]?.input).toMatchObject({
      id: 'media-id',
      uploadToken: 'replacement-token',
      key: 'public/uploads/replacement.png',
    })
  })
})
