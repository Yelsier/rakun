import { describe, expect, it } from 'bun:test'

import { buildSeoChecks, getSeoScore } from './seo-analysis'

import type { SeoAnalysisReport } from '../_hooks/useContentPreview'

const report = (overrides: Partial<SeoAnalysisReport> = {}): SeoAnalysisReport => ({
  url: 'https://example.com/page',
  title: 'A useful page title with an appropriate search length',
  description:
    'A complete meta description that explains what this page contains and gives search visitors enough useful context before they decide to open it.',
  canonical: 'https://example.com/page',
  siteUrl: 'https://example.com',
  robots: 'index, follow',
  language: 'en',
  headings: [
    { level: 1, text: 'Page title' },
    { level: 2, text: 'Section' },
  ],
  images: { total: 1, missingAlt: 0, emptyAlt: 0 },
  structuredData: [
    {
      raw: '{"@context":"https://schema.org","@type":"Article"}',
      valid: true,
      hasContext: true,
      types: ['Article'],
      error: '',
    },
  ],
  openGraph: {
    title: 'Page title',
    description: 'Page description',
    image: 'https://example.com/image.jpg',
    url: 'https://example.com/page',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Page title',
    description: 'Page description',
    image: 'https://example.com/image.jpg',
  },
  ...overrides,
})

describe('SEO analysis', () => {
  it('scores a complete page as healthy', () => {
    const checks = buildSeoChecks(report())

    expect(checks.every((check) => check.status === 'good')).toBe(true)
    expect(getSeoScore(checks)).toBe(100)
  })

  it('detects missing essentials and skipped heading levels', () => {
    const checks = buildSeoChecks(
      report({
        title: '',
        description: '',
        headings: [{ level: 3, text: 'Skipped heading' }],
        images: { total: 2, missingAlt: 1, emptyAlt: 0 },
        robots: 'noindex, nofollow',
      })
    )

    expect(checks.find((check) => check.id === 'title')?.status).toBe('error')
    expect(checks.find((check) => check.id === 'h1')?.status).toBe('error')
    expect(checks.find((check) => check.id === 'headings')?.status).toBe('warning')
    expect(checks.find((check) => check.id === 'images')?.status).toBe('error')
    expect(checks.find((check) => check.id === 'indexing')?.status).toBe('error')
  })
})
