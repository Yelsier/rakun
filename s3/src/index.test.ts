import { describe, expect, spyOn, test } from 'bun:test'

import { closeLogger, createLogger } from '@rakun-kit/core/logger'
import { S3Adapter } from './index'

describe('S3Adapter public URLs', () => {
  test('does not log an expected missing-object HEAD response as an error', async () => {
    const adapter = new S3Adapter({
      privateBucket: 'private',
      publicBucket: 'public',
      region: 'eu-west-1',
    })
    const missing = Object.assign(new Error('UnknownError'), {
      $metadata: { httpStatusCode: 404 },
    })
    const adapterWithClient = adapter as unknown as { s3: { send: () => Promise<never> } }
    adapterWithClient.s3 = {
      send: async () => { throw missing },
    }
    const logged = spyOn(createLogger({ level: 'fatal' }), 'error').mockImplementation(() => undefined)
    try {
      await expect(adapter.headObject({ key: 'public/uploads/new.mp4', access: 'public' })).rejects.toBe(missing)
      expect(logged).not.toHaveBeenCalled()
    } finally {
      logged.mockRestore()
      await closeLogger()
    }
  })

  test('maps public object keys to the stable media route without duplicating the prefix', () => {
    const adapter = new S3Adapter({
      privateBucket: 'private',
      publicBaseUrl: 'https://example.test/api/media',
      publicBucket: 'public',
      region: 'eu-west-1',
    })

    expect(adapter.publicUrl({ access: 'public', key: 'public/uploads/hello world.png' })).toBe(
      'https://example.test/api/media/uploads/hello%20world.png'
    )
    expect(adapter.publicUrl({ access: 'private', key: 'private/uploads/private.png' })).toBeNull()
  })

  test('reads public media from the adapter with server credentials', async () => {
    const adapter = new S3Adapter({
      privateBucket: 'private',
      publicBucket: 'public',
      region: 'eu-west-1',
    })
    const commands: Array<{ input: { Bucket?: string; Key?: string; Range?: string } }> = []
    const adapterWithClient = adapter as unknown as {
      s3: { send: (command: (typeof commands)[number]) => unknown }
    }
    adapterWithClient.s3 = {
      send(command) {
        commands.push(command)
        return {
          $metadata: { httpStatusCode: 200 },
          AcceptRanges: 'bytes',
          Body: new Uint8Array([104, 105]),
          ContentLength: 2,
          ContentType: 'text/plain',
          ETag: '"asset"',
        }
      },
    }

    const object = await adapter.getPublicObject({
      key: 'public/uploads/asset.txt',
      method: 'GET',
      range: 'bytes=0-1',
    })

    expect(await new Response(object.body).text()).toBe('hi')
    expect(object.contentType).toBe('text/plain')
    expect(commands[0]?.input).toMatchObject({
      Bucket: 'public',
      Key: 'public/uploads/asset.txt',
      Range: 'bytes=0-1',
    })
  })
})
