import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'

import { Video } from './Video'

describe('Video', () => {
  test('puts WebM before MP4 so the browser prefers it when supported', () => {
    const html = renderToStaticMarkup(
      <Video
        controls
        video={{
          url: '/media/video.mp4',
          mime: 'video/mp4',
          title: 'Demo',
          sources: [
            { url: '/media/video.mp4', mime: 'video/mp4' },
            { url: '/media/video.webm', mime: 'video/webm' },
          ],
        }}
      />
    )

    expect(html.indexOf('video/webm')).toBeLessThan(html.indexOf('video/mp4'))
    expect(html.match(/video\.mp4/g)).toHaveLength(1)
    expect(html).toContain('<video controls="" title="Demo">')
  })

  test('resolves public source keys and keeps children after the sources', () => {
    const html = renderToStaticMarkup(
      <Video
        video={{
          access: 'public',
          sources: [
            { key: 'public/videos/demo final.mp4', mime: 'video/mp4' },
            { key: 'public/videos/demo final.webm', mime: 'video/webm' },
          ],
        }}
        mediaBaseUrl="https://cdn.example.com"
      >
        Video unavailable
      </Video>
    )

    expect(html).toContain('src="https://cdn.example.com/media/public/videos/demo%20final.webm"')
    expect(html.indexOf('<source')).toBeLessThan(html.indexOf('Video unavailable'))
  })

  test('does not expose private keys without a resolved URL', () => {
    const html = renderToStaticMarkup(
      <Video
        video={{
          access: 'private',
          sources: [{ key: 'private/video.webm', mime: 'video/webm' }],
        }}
      />
    )

    expect(html).toBe('<video></video>')
  })
})
