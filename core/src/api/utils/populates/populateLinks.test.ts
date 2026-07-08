import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetMongoService = mock();
const mockGetLanguages = mock();

mock.module("../../../orm", () => ({
  getMongoService: mockGetMongoService,
}));

mock.module("../getLanguages", () => ({
  getLanguages: mockGetLanguages,
}));

import { Language, RouteMap } from "../../../internal-content-types";
import type ContentType from "../../../lib/ContentType";
import type { DBOutput } from "../../../lib/types";

const { populateLinks } = await import("./populateLinks");

type LanguageRow = DBOutput<typeof Language>;
type RouteMapRow = DBOutput<typeof RouteMap>;

const languages: LanguageRow[] = [
  {
    _id: "language-en",
    _type: "Language",
    code: "en",
    name: "English",
    default: true,
  },
  {
    _id: "language-es",
    _type: "Language",
    code: "es",
    name: "Spanish",
    default: false,
  },
];

const makeRouteMap = (overrides: Partial<RouteMapRow>): RouteMapRow =>
  ({
    _id: `${overrides.routeId ?? "route-id"}-${overrides.languageId ?? "language-en"}`,
    _type: "RouteMap",
    path: "/en/fallback/",
    contentType: "Page",
    contentTypeId: "content-id",
    routeId: "route-id",
    languageId: "language-en",
    ...overrides,
  }) as RouteMapRow;

const setRouteMaps = (routeMaps: RouteMapRow[]) => {
  const list = mock(
    async (
      _contentType: unknown,
      params: {
        filter: {
          routeId: string;
          contentTypeId?: string;
          variantGroupId?: string;
        };
      },
    ) => ({
      items: routeMaps.filter(
        (routeMap) =>
          routeMap.routeId === params.filter.routeId &&
          (params.filter.variantGroupId
            ? routeMap.variantGroupId === params.filter.variantGroupId
            : routeMap.contentTypeId === params.filter.contentTypeId),
      ),
    }),
  );

  mockGetMongoService.mockResolvedValue({ list });
  mockGetLanguages.mockResolvedValue(languages);

  return list;
};

describe("populateLinks", () => {
  beforeEach(() => {
    mockGetMongoService.mockReset();
    mockGetLanguages.mockReset();
  });

  it("replaces link fields with localized route map paths", async () => {
    const list = setRouteMaps([
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        languageId: "language-en",
        path: "/en/about/",
      }),
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        languageId: "language-es",
        path: "/es/sobre/",
      }),
      makeRouteMap({
        routeId: "route-contact",
        contentTypeId: "contact-id",
        languageId: "language-en",
        path: "/en/contact/",
      }),
      makeRouteMap({
        routeId: "route-contact",
        contentTypeId: "contact-id",
        languageId: "language-es",
        path: "/es/contacto/",
      }),
    ]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      title: "Docs",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
      blocks: [
        {
          ctaLink: {
            routeId: "route-contact",
            contentTypeId: "contact-id",
          },
        },
      ],
      untouched: {
        routeId: "route-about",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      title: "Docs",
      primaryLink: {
        _tag: "Translatable",
        en: "/en/about/",
        es: "/es/sobre/",
      },
      blocks: [
        {
          ctaLink: {
            _tag: "Translatable",
            en: "/en/contact/",
            es: "/es/contacto/",
          },
        },
      ],
      untouched: {
        routeId: "route-about",
      },
    });
    expect(list).toHaveBeenCalledTimes(4);
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: "route-about",
        variantGroupId: "about-id",
      },
      options: { limit: "all" },
    });
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
      options: { limit: "all" },
    });
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: "route-contact",
        variantGroupId: "contact-id",
      },
      options: { limit: "all" },
    });
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: "route-contact",
        contentTypeId: "contact-id",
      },
      options: { limit: "all" },
    });
  });

  it("uses the default language code when a route map language is missing", async () => {
    setRouteMaps([
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        languageId: "missing-language",
        path: "/fallback/about/",
      }),
    ]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        _tag: "Translatable",
        en: "/fallback/about/",
      },
    });
  });

  it("resolves links through locale variant groups", async () => {
    const list = setRouteMaps([
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        variantGroupId: "about-id",
        languageId: "language-en",
        path: "/en/about/",
      }),
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-es-id",
        variantGroupId: "about-id",
        languageId: "language-es",
        path: "/es/sobre/",
      }),
    ]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        _tag: "Translatable",
        en: "/en/about/",
        es: "/es/sobre/",
      },
    });
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: "route-about",
        variantGroupId: "about-id",
      },
      options: { limit: "all" },
    });
  });

  it("matches route map languages by string value", async () => {
    setRouteMaps([
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        languageId: {
          toString: () => "language-es",
        } as unknown as string,
        path: "/es/sobre/",
      }),
    ]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        _tag: "Translatable",
        es: "/es/sobre/",
      },
    });
  });

  it("keeps the link value when no route map is found", async () => {
    const list = setRouteMaps([]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: {
        routeId: "route-about",
        contentTypeId: "about-id",
      },
    });
    expect(list).toHaveBeenCalledTimes(2);
  });
});
