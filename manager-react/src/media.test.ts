import { describe, expect, test } from 'bun:test'

import { uploadFileToPresignedUrl } from './media'

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
