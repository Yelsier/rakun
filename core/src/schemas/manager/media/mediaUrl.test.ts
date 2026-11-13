import { expect, test } from 'bun:test'

import { finalizeUploadOutput } from './finalizeUpload'
import { mediaUrl } from './mediaUrl'

test('accepts same-origin media URLs returned after a video upload', () => {
  const result = finalizeUploadOutput.parse({
    key: 'public/uploads/video.mp4',
    access: 'public',
    size: 100,
    mime: 'video/mp4',
    publicUrl: '/api/media/public/uploads/video.mp4',
    media: {
      _id: 'video-1',
      _type: 'Media',
      name: 'video.mp4',
      originalName: 'video.mp4',
      key: 'public/uploads/video.mp4',
      access: 'public',
      mime: 'video/mp4',
      size: 100,
      url: '/api/media/public/uploads/video.mp4',
      sources: [
        { key: 'public/uploads/video.webm', url: '/api/media/public/uploads/video.webm', mime: 'video/webm', size: 80 },
        { key: 'public/uploads/video.mp4', url: '/api/media/public/uploads/video.mp4', mime: 'video/mp4', size: 100 },
      ],
      uploadedAt: new Date(),
      status: 'uploaded',
    },
  })
  expect(result.media.sources).toHaveLength(2)
})

test('rejects protocol-relative and malformed media paths', () => {
  expect(mediaUrl.safeParse('//other.example/video.mp4').success).toBe(false)
  expect(mediaUrl.safeParse('/\\other.example/video.mp4').success).toBe(false)
  expect(mediaUrl.safeParse('/api/media/has space').success).toBe(false)
  expect(mediaUrl.safeParse('not-a-url').success).toBe(false)
  expect(mediaUrl.safeParse('https://example.com/video.mp4').success).toBe(true)
})
