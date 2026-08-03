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
import ContentType from "../../../lib/ContentType";
import { Fields } from "../../../lib/fields";
import { registerContentType } from "../../../lib/Registry";
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

const LinkTestPage = new ContentType({
  name: "PopulateLinksTypeAwarePage",
  fields: {
    primaryLink: Fields.link(),
    links: Fields.array(Fields.link()),
  },
});

registerContentType(LinkTestPage);

const makeRouteMap = (overrides: Partial<RouteMapRow>): RouteMapRow =>
  ({
    _id: `${overrides.routeId ?? "route-id"}-${overrides.languageId ?? "language-en"}`,
    _type: "RouteMap",
    path: "/fallback/",
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
        path: "/about/",
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
        path: "/contact/",
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
        title: "About us",
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
        href: {
          _tag: "Translatable",
          en: "/about/",
          es: "/es/sobre/",
        },
        title: "About us",
      },
      blocks: [
        {
          ctaLink: {
            href: {
              _tag: "Translatable",
              en: "/contact/",
              es: "/es/contacto/",
            },
            title: "",
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
        href: {
          _tag: "Translatable",
          en: "/fallback/about/",
        },
        title: "",
      },
    });
  });

  it("keeps direct URLs without querying route maps", async () => {
    const list = setRouteMaps([]);

    const result = await populateLinks({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: "https://example.com/docs",
      titledLink: {
        href: "https://example.com/guides",
        title: "Guides",
      },
      nested: {
        link: "/contact/",
      },
    } as DBOutput<ContentType>);

    expect(result).toEqual({
      _id: "page-id",
      _type: "TestPage",
      primaryLink: "https://example.com/docs",
      titledLink: {
        href: "https://example.com/guides",
        title: "Guides",
      },
      nested: {
        link: "/contact/",
      },
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("normalizes legacy direct strings for typed link fields and arrays", async () => {
    const list = setRouteMaps([]);

    const result = await populateLinks({
      _id: "page-id",
      _type: LinkTestPage.name,
      primaryLink: "https://example.com/docs",
      links: ["/about/", { href: "/contact/", title: "Contact" }],
    } as DBOutput<typeof LinkTestPage>);

    expect(result).toEqual({
      _id: "page-id",
      _type: LinkTestPage.name,
      primaryLink: {
        href: "https://example.com/docs",
        title: "",
      },
      links: [
        { href: "/about/", title: "" },
        { href: "/contact/", title: "Contact" },
      ],
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("resolves links through locale variant groups", async () => {
    const list = setRouteMaps([
      makeRouteMap({
        routeId: "route-about",
        contentTypeId: "about-id",
        variantGroupId: "about-id",
        languageId: "language-en",
        path: "/about/",
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
        href: {
          _tag: "Translatable",
          en: "/about/",
          es: "/es/sobre/",
        },
        title: "",
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
        href: {
          _tag: "Translatable",
          es: "/es/sobre/",
        },
        title: "",
      },
    });
  });

  it("keeps the object shape when no route map is found", async () => {
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
        href: "",
        title: "",
      },
    });
    expect(list).toHaveBeenCalledTimes(2);
  });
});
