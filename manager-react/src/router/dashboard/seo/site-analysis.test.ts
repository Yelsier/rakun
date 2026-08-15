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

  it('warns instead of erroring when a page uses the default description', () => {
    const defaultDescription =
      'A global description used when a page has no description of its own. It is long enough to satisfy the recommended metadata length for this test.'
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      defaultDescription,
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [{ _id: 'one', _seo: { title: 'A page title' } }],
        },
      ],
    })

    expect(payload.pages[0]?.description).toBe(defaultDescription)
    expect(payload.pages[0]?.findings).toContainEqual({
      code: 'defaultDescription',
      severity: 'warning',
    })
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'missingDescription',
    )
  })

  it('accepts the default title without a warning on the home page', () => {
    const defaultTitle = 'The global site title used by the home page'
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      defaultTitle,
      homePageGroupId: 'home',
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [
            {
              _id: 'home',
              _seo: {
                description:
                  'A page description long enough to avoid distracting from the title fallback behavior covered by this focused SEO audit test.',
              },
            },
          ],
        },
      ],
    })

    expect(payload.pages[0]?.title).toBe(defaultTitle)
    expect(payload.pages[0]?.label).toBe(defaultTitle)
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'defaultTitle',
    )
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'missingTitle',
    )
  })

  it('warns when a non-home page uses global metadata defaults', () => {
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      defaultTitle: 'The global site title used as a fallback',
      defaultDescription:
        'A global description used when a page has no description of its own. It is long enough to satisfy the recommended metadata length for this test.',
      homePageGroupId: 'home',
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [{ _id: 'about', _seo: {} }],
        },
      ],
    })

    expect(payload.pages[0]?.findings).toEqual(
      expect.arrayContaining([
        { code: 'defaultTitle', severity: 'warning' },
        { code: 'defaultDescription', severity: 'warning' },
      ]),
    )
  })

  it('recognizes a localized home page by its variant group', () => {
    const payload = buildSiteSeoAudit({
      siteUrl: 'https://example.com',
      defaultTitle: 'The global site title used by localized home pages',
      defaultDescription:
        'A global description used by localized home pages. It provides enough useful information to serve as realistic metadata for this audit test.',
      homePageGroupId: 'home-group',
      resolveValue,
      contents: [
        {
          contentType: 'Page',
          documents: [
            {
              _id: 'home-es',
              _localeVariantGroupId: 'home-group',
              _seo: {},
            },
          ],
        },
      ],
    })

    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'defaultTitle',
    )
    expect(payload.pages[0]?.findings.map((finding) => finding.code)).not.toContain(
      'defaultDescription',
    )
  })
})
