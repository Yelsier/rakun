import { describe, expect, it } from 'bun:test'

import { buildSiteSeoAudit, getSiteSeoAuditCounts } from './site-analysis'

const resolveValue = (value: unknown) => value

describe('site SEO analysis', () => {
  it('only audits published documents and detects duplicate metadata', () => {
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      resolveValue,
      contents: [
        {
          contentType: 'Article',
          documentVisibility: true,
          documents: [
            {
              _id: 'published-one',
              _visibility: 'published',
              _seo: { title: 'Repeated title', description: 'Repeated description' },
            },
            {
              _id: 'published-two',
              _visibility: 'published',
              _seo: { title: 'Repeated title', description: 'Repeated description' },
            },
            {
              _id: 'draft',
              _visibility: 'draft',
              _seo: {},
            },
          ],
        },
      ],
    })

    expect(payload.pages).toHaveLength(2)
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).toContain(
      'duplicateTitle',
    )
    expect(payload.pages[1]?.findings.map((finding) => finding.code)).toContain(
      'duplicateDescription',
    )
  })

  it('reports the missing canonical base only when neither source exists', () => {
    const withoutSiteUrl = buildSiteSeoAudit({
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [{ _id: 'one', _seo: {} }],
        },
      ],
    })
    const withSiteUrl = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [{ _id: 'one', _seo: {} }],
        },
      ],
    })

    expect(withoutSiteUrl.pages[0]?.findings.map((finding) => finding.code)).toContain(
      'missingCanonicalBase',
    )
    expect(withSiteUrl.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'missingCanonicalBase',
    )
    expect(getSiteSeoAuditCounts(withSiteUrl).score).toBeGreaterThanOrEqual(0)
  })

  it('resolves SEO fields bound to the current document', () => {
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      resolveValue,
      contents: [
        {
          contentType: 'Article',
          documents: [
            {
              _id: 'one',
              headline: 'A document title used by the SEO binding',
              summary:
                'A document description used by the SEO binding. It is intentionally long enough to behave like realistic metadata in this audit test.',
              _seo: {
                _bindings: {
                  fields: {
                    title: { contentType: 'Article', path: 'headline' },
                    description: { contentType: 'Article', path: 'summary' },
                  },
                },
              },
            },
          ],
        },
      ],
    })

    expect(payload.pages[0]?.title).toBe('A document title used by the SEO binding')
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'missingDescription',
    )
  })
})
