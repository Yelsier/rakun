import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetMongoService = mock();
const mockGetLanguages = mock();
const mockGetRakunBootstrapOptions = mock();

mock.module("../../orm", () => ({
  getMongoService: mockGetMongoService,
}));

mock.module("../../bootstrapState", () => ({
  getRakunBootstrapOptions: mockGetRakunBootstrapOptions,
}));

mock.module("./getLanguages", () => ({
  getLanguages: mockGetLanguages,
}));

import { Language, Route, RouteMap } from "../../internal-content-types";
import type { DBOutput } from "../../lib/types";

const { getLink } = await import("./getLink");

type LanguageRow = DBOutput<typeof Language>;
type RouteRow = DBOutput<typeof Route>;
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

const route = {
  _id: "route-page",
  _type: "Route",
  basePath: { _tag: "Translatable", en: "" },
  contentType: "Page",
  field: "slug",
  hasPage: true,
  dynamic: false,
  layoutContentOrder: 0,
} as RouteRow;

describe("getLink", () => {
  beforeEach(() => {
    mockGetMongoService.mockReset();
    mockGetLanguages.mockReset();
    mockGetRakunBootstrapOptions.mockReset();

    mockGetLanguages.mockResolvedValue(languages);
    mockGetRakunBootstrapOptions.mockReturnValue({
      routes: [
        {
          key: "page",
          contentType: "Page",
          field: "slug",
        },
      ],
    });
  });

  it("maps default-language root paths through languageId", async () => {
    const routeMaps: RouteMapRow[] = [
      {
        _id: "route-map-en",
        _type: "RouteMap",
        path: "/about/",
        contentType: "Page",
        contentTypeId: "about-en",
        variantGroupId: "about-group",
        routeId: route._id,
        languageId: "language-en",
      },
      {
        _id: "route-map-es",
        _type: "RouteMap",
        path: "/es/sobre/",
        contentType: "Page",
        contentTypeId: "about-es",
        variantGroupId: "about-group",
        routeId: route._id,
        languageId: "language-es",
      },
    ] as RouteMapRow[];
    const find = mock(async () => route);
    const list = mock(
      async (
        _contentType: unknown,
        params: { filter: { routeId: string; variantGroupId?: string } },
      ) => ({
        items: routeMaps.filter(
          (item) =>
            String(item.routeId) === String(params.filter.routeId) &&
            item.variantGroupId === params.filter.variantGroupId,
        ),
      }),
    );

    mockGetMongoService.mockResolvedValue({ find, list });

    await expect(getLink("page", "about-group")).resolves.toEqual({
      _tag: "Translatable",
      en: "/about/",
      es: "/es/sobre/",
    });
    expect(list).toHaveBeenCalledWith(RouteMap, {
      filter: {
        routeId: route._id,
        variantGroupId: "about-group",
      },
      options: { limit: "all", fields: ["path", "languageId"] },
    });
  });
});
