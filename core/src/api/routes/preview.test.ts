import { Db } from "mongodb";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "bun:test";

import { rakunBootstrap } from "../../index";
import {
  Language,
  PreviewSnapshot,
  Route,
  RouteMap,
  RouteSettings,
  Seo,
} from "../../internal-content-types";
import ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import { Fields } from "../../lib/fields";
import { createLogger } from "../../lib/Logger";
import { encodeContentTypeForManager } from "../../lib/Registry";
import { ITERATOR_FIELD_NAME, SEO_FIELD_NAME } from "../../lib/systemFields";
import {
  closeDatabase,
  createMongoService,
  getMongoService,
} from "../../orm";
import type { RakunRequestContext } from "../context";
import { createPreviewHandler } from "./manager/preview/create";
import { getPage } from "./web/page";
import { getPreviewPage } from "./web/previewPage";

const mongoConfig = {
  MONGO_URI: "mongodb://localhost:27017/cms_test_preview",
  ENVIRONMENT: "test" as const,
};

const PreviewModule = new ContentType({
  name: "PreviewTestModule",
  fields: {
    text: Fields.string().translatable().required(),
    eyebrow: Fields.string(),
  },
});

const PreviewPage = new ContentType({
  name: "PreviewTestPage",
  fields: {
    title: Fields.string().translatable().required(),
    slug: Fields.string().type("Slug").translatable().required(),
    credits: Fields.string(),
  },
  iterator: [
    {
      contentType: PreviewModule,
      type: "new",
    },
  ],
});

const user = {
  _id: "64f0c0000000000000000001",
  _type: "ManagerUser",
  user: "Preview User",
  email: "preview@example.com",
  role: {
    _id: "64f0c0000000000000000002",
    _type: "ManagerRole",
    name: "Admin",
    permissions: [],
  },
  twoFactorEnabled: false,
};

const ctx = {
  user,
  getUser: () => user,
} as unknown as RakunRequestContext;

const translatable = (value: string) => ({
  _tag: "Translatable" as const,
  en: value,
});

const seo = (title: string) => ({
  type: "new" as const,
  data: {
    _type: Seo.name,
    title: translatable(title),
    description: translatable(`${title} description`),
  },
});

const pageData = ({
  credits,
  slug,
  title,
  moduleText,
  visibleWhenCredits,
}: {
  credits?: string;
  slug: string;
  title: string;
  moduleText: string;
  visibleWhenCredits?: boolean;
}) => ({
  _type: PreviewPage.name,
  title: translatable(title),
  slug: translatable(slug),
  credits: credits ?? null,
  [ITERATOR_FIELD_NAME]: [
    {
      name: PreviewModule.name,
      value: {
        type: "new" as const,
        data: {
          _type: PreviewModule.name,
          text: translatable(moduleText),
          eyebrow: null,
        },
      },
      ...(visibleWhenCredits
        ? {
            visibleWhen: {
              field: "credits",
              operator: "notEmpty" as const,
            },
          }
        : {}),
    },
  ],
  [SEO_FIELD_NAME]: seo(title),
  _visibility: "draft",
});

describe.serial("preview", () => {
  beforeAll(async () => {
    createLogger({
      level: "error",
      batchSize: 1000,
      maxQueue: 50000,
      prettify: true,
    });

    await createMongoService(mongoConfig);

    rakunBootstrap({
      literals: {},
      contentTypes: [PreviewModule, PreviewPage],
      routes: [
        {
          key: "preview-pages",
          contentType: PreviewPage.name,
          field: "slug",
          hasPage: true,
          dynamic: false,
          defaultBasePath: "",
        },
      ],
      mongo: mongoConfig,
      logger: {
        level: "error",
        prettify: true,
      },
    });
  });

  afterAll(async () => {
    const dbService = await getMongoService(mongoConfig);
    await (dbService.rawDB as Db).dropDatabase();
    await closeDatabase(mongoConfig);
  });

  beforeEach(async () => {
    const db = await getMongoService(mongoConfig);
    await db.clear(PreviewSnapshot);
    await db.clear(RouteSettings);
    await db.clear(RouteMap);
    await db.clear(Route);
    await db.clear(Language);
    await db.clear(PreviewPage);
    await db.clear(PreviewModule);

    await db.create(Language, {
      _type: Language.name,
      code: "en",
      name: "English",
      default: true,
    });
  });

  it("renders an unsaved draft snapshot without exposing the token hash", async () => {
    const db = await getMongoService(mongoConfig);
    const result = await createPreviewHandler({
      ctx,
      input: {
        contentType: PreviewPage.name,
        languageCode: "en",
        routeKey: "preview-pages",
        data: pageData({
          slug: "draft-page",
          title: "Draft title",
          moduleText: "Live module",
        }),
      },
    });

    expect(result.path).toBe("/draft-page/");
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const snapshot = await db.find(PreviewSnapshot, { path: result.path });
    expect(snapshot?.tokenHash).toBeDefined();
    expect(snapshot?.tokenHash).not.toBe(result.token);
    expect(snapshot?.data).toContain("Draft title");

    const preview = await getPreviewPage({
      token: result.token,
      path: result.path,
    });
    expect(preview.modules[0]?._type).toBe(PreviewModule.name);
    expect(preview.modules[0]?.text).toBe("Live module");
    expect(preview.modules[0]?.eyebrow).toBeUndefined();
    expect(preview.info?.title).toBe("Draft title");

    const publicPage = await getPage({ path: result.path });
    expect(publicPage.modules[0]?._type).toBe("NotFound");
  });

  it("adds optional seo fields and manager flags for routeable content types", () => {
    const encoded = PreviewPage.getInputSchema().parse({
      _type: PreviewPage.name,
      title: translatable("SEO flag"),
      slug: translatable("seo-flag"),
      [ITERATOR_FIELD_NAME]: [],
    });

    expect(PreviewPage.hasIterator).toBe(true);
    expect(PreviewPage.hasSeo).toBe(true);
    expect(PreviewPage.fields[SEO_FIELD_NAME]?.getIsRequired()).toBe(false);
    expect(encodeContentTypeForManager(PreviewPage).hasIterator).toBe(true);
    expect(encodeContentTypeForManager(PreviewPage).hasSeo).toBe(true);
    expect((encoded as Record<string, unknown>)[SEO_FIELD_NAME]).toBeUndefined();
  });

  it("evaluates conditional iterator modules against unsaved preview data", async () => {
    const hiddenResult = await createPreviewHandler({
      ctx,
      input: {
        contentType: PreviewPage.name,
        languageCode: "en",
        routeKey: "preview-pages",
        data: pageData({
          slug: "conditional-hidden",
          title: "Conditional hidden",
          moduleText: "Credits module",
          visibleWhenCredits: true,
        }),
      },
    });

    const hiddenPreview = await getPreviewPage({
      token: hiddenResult.token,
      path: hiddenResult.path,
    });
    expect(hiddenPreview.modules).toHaveLength(0);

    const visibleResult = await createPreviewHandler({
      ctx,
      input: {
        contentType: PreviewPage.name,
        languageCode: "en",
        routeKey: "preview-pages",
        data: pageData({
          credits: "Produced by Rakun",
          slug: "conditional-visible",
          title: "Conditional visible",
          moduleText: "Credits module",
          visibleWhenCredits: true,
        }),
      },
    });

    const visiblePreview = await getPreviewPage({
      token: visibleResult.token,
      path: visibleResult.path,
    });
    expect(visiblePreview.modules[0]?._type).toBe(PreviewModule.name);
  });

  it("does not fall back to public content for invalid token or path", async () => {
    const result = await createPreviewHandler({
      ctx,
      input: {
        contentType: PreviewPage.name,
        languageCode: "en",
        data: pageData({
          slug: "token-page",
          title: "Token title",
          moduleText: "Token module",
        }),
      },
    });

    const wrongToken = await getPreviewPage({
      token: "wrong",
      path: result.path,
    });
    expect(wrongToken.modules[0]?._type).toBe("NotFound");

    const wrongPath = await getPreviewPage({
      token: result.token,
      path: "/other/",
    });
    expect(wrongPath.modules[0]?._type).toBe("NotFound");
  });

  it("requires an authenticated manager user", async () => {
    await expect(
      createPreviewHandler({
        ctx: {
          getUser: () => {
            throwAppError("AUTH_REQUIRED");
          },
        } as unknown as RakunRequestContext,
        input: {
          contentType: PreviewPage.name,
          data: pageData({
            slug: "auth-page",
            title: "Auth title",
            moduleText: "Auth module",
          }),
        },
      }),
    ).rejects.toMatchObject({ appError: { key: "AUTH_REQUIRED" } });
  });
});
