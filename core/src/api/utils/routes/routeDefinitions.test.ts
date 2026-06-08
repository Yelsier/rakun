import { describe, expect, it } from "bun:test";

import {
  createTranslatableBasePath,
  getRouteLayoutContentOrder,
  getRouteLayoutModules,
  routeSignature,
  type RouteDefinition,
} from "./routeDefinitions";

describe("route definitions", () => {
  it("uses content item position as layout content order", () => {
    const definition: RouteDefinition = {
      key: "article",
      contentType: "Article",
      field: "slug",
      hasPage: true,
      dynamic: false,
      defaultBasePath: "blog",
      layout: [
        { type: "module", key: "hero", contentType: "Hero" },
        { type: "content" },
        { type: "module", key: "aside", contentType: "Aside" },
      ],
    };

    expect(getRouteLayoutContentOrder(definition)).toBe(1);
    expect(getRouteLayoutModules(definition)).toEqual([
      { type: "module", key: "hero", contentType: "Hero", order: 0 },
      { type: "module", key: "aside", contentType: "Aside", order: 2 },
    ]);
  });

  it("places content after modules when layout has no content item", () => {
    const definition: RouteDefinition = {
      key: "article",
      contentType: "Article",
      field: "slug",
      hasPage: true,
      dynamic: false,
      defaultBasePath: "blog",
      layout: [{ type: "module", key: "hero", contentType: "Hero" }],
    };

    expect(getRouteLayoutContentOrder(definition)).toBe(1);
  });

  it("creates localized base paths from strings and partial locale maps", () => {
    expect(createTranslatableBasePath("blog", ["en", "es"])).toEqual({
      _tag: "Translatable",
      en: "blog",
      es: "blog",
    });

    expect(
      createTranslatableBasePath({ en: "blog", es: "blog-es" }, [
        "en",
        "es",
        "fr",
      ]),
    ).toEqual({
      _tag: "Translatable",
      en: "blog",
      es: "blog-es",
      fr: "",
    });
  });

  it("builds route signatures from content type and field only", () => {
    expect(routeSignature({ contentType: "Article", field: "slug" })).toBe(
      "Article:slug",
    );
  });
});
