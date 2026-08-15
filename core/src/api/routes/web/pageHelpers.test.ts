import { describe, expect, it } from "bun:test";

import ContentType from '../../../lib/ContentType'
import { Fields } from '../../../lib/fields'
import {
  filterNestedVisibleIteratorItems,
  isPublicPageContent,
  stripPageInfoCompositionFields,
} from './page'

const PublicPage = new ContentType({
  name: 'PublicPageTest',
  fields: { slug: Fields.string().required() },
}).enableDocumentVisibility()

describe("web page nested iterator filtering", () => {
  it('does not serve legacy documents without visibility as published pages', () => {
    expect(
      isPublicPageContent(PublicPage, {
        _id: 'legacy-page',
        _type: PublicPage.name,
      }),
    ).toBe(false)
    expect(
      isPublicPageContent(PublicPage, {
        _id: 'published-page',
        _type: PublicPage.name,
        _visibility: 'published',
      }),
    ).toBe(true)
  })

  it("preserves dates inside nested iterator values", () => {
    const publishedAt = new Date("2026-08-14T16:12:00.000Z");
    const value = {
      useCases: [
        {
          name: "UseCase",
          value: { publishedAt },
        },
      ],
    };

    const filtered = filterNestedVisibleIteratorItems(
      value,
      () => true,
    ) as typeof value;

    expect(filtered.useCases[0]?.value.publishedAt).toBe(publishedAt);
  });

  it('removes composition fields from nested page info', () => {
    const publishedAt = new Date('2026-08-15T08:00:00.000Z')
    const info = {
      title: 'Project',
      category: {
        _id: 'category-1',
        title: 'Web',
        _iterator: [{ name: 'HiddenModule' }],
        _seo: { title: 'Hidden SEO' },
        parent: {
          title: 'Work',
          _iteratorUnlinked: true,
          _iterator: [{ name: 'NestedHiddenModule' }],
        },
      },
      related: [
        {
          title: 'Another project',
          publishedAt,
          _seo: { title: 'Nested SEO' },
        },
      ],
    }

    const stripped = stripPageInfoCompositionFields(info)

    expect(stripped).toEqual({
      title: 'Project',
      category: {
        _id: 'category-1',
        title: 'Web',
        parent: { title: 'Work' },
      },
      related: [{ title: 'Another project', publishedAt }],
    })
    expect(
      (stripped.related as Array<Record<string, unknown>>)[0]?.publishedAt,
    ).toBe(publishedAt)
  })
});
