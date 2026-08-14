import { describe, expect, it } from "bun:test";

import ContentType from '../../../lib/ContentType'
import { Fields } from '../../../lib/fields'
import { filterNestedVisibleIteratorItems, isPublicPageContent } from './page'

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
});
