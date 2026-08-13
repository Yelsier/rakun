import { describe, expect, test } from 'bun:test'

import { getMediaDownloadAssets, getMediaDownloadFileName } from './mediaDownload'

import type { MediaRecord } from '@/lib/media'

const createMedia = (patch: Partial<MediaRecord> = {}): MediaRecord => ({
  _id: 'media-1',
  _type: 'Media',
  name: 'Hero',
  originalName: 'hero.jpg',
  key: 'public/hero.webp',
  access: 'public',
  mime: 'image/webp',
  size: 1200,
  uploadedAt: new Date('2026-01-01T00:00:00.000Z'),
  status: 'uploaded',
  ...patch,
})

describe('media downloads', () => {
  test('includes the primary image and all responsive sizes', () => {
    const media = createMedia({
      width: 1600,
      height: 900,
      sizes: [
        {
          key: 'public/hero-320.webp',
          width: 320,
          height: 180,
          mime: 'image/webp',
          size: 300,
        },
        {
          key: 'public/hero-640.webp',
          width: 640,
          height: 360,
          mime: 'image/webp',
          size: 600,
        },
      ],
    })

    const assets = getMediaDownloadAssets(media)

    expect(assets).toHaveLength(3)
    expect(getMediaDownloadFileName(media, assets[0]!)).toBe('hero.webp')
    expect(getMediaDownloadFileName(media, assets[1]!)).toBe('hero-320w.webp')
  })

  test('includes video formats without duplicating the primary source', () => {
    const media = createMedia({
      originalName: 'intro.mov',
      key: 'public/intro.mp4',
      mime: 'video/mp4',
      sources: [
        { key: 'public/intro.mp4', mime: 'video/mp4', size: 1000 },
        { key: 'public/intro.webm', mime: 'video/webm', size: 800 },
      ],
    })

    const assets = getMediaDownloadAssets(media)

    expect(assets).toHaveLength(2)
    expect(getMediaDownloadFileName(media, assets[0]!)).toBe('intro.mp4')
    expect(getMediaDownloadFileName(media, assets[1]!)).toBe('intro.webm')
  })

  test('keeps documents as a single downloadable asset', () => {
    const media = createMedia({
      originalName: 'guide.pdf',
      key: 'public/guide.pdf',
      mime: 'application/pdf',
    })

    const assets = getMediaDownloadAssets(media)

    expect(assets).toHaveLength(1)
    expect(getMediaDownloadFileName(media, assets[0]!)).toBe('guide.pdf')
  })
})
