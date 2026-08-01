import bcrypt from "bcrypt";
import { MongoClient, type Db, type Document } from "mongodb";
import {
  HelloWorld,
  LiteralTranslation,
  Media,
  RouteLocaleVariant,
  Seo,
} from "@rakun-kit/next/internal-content-types";
import {
  ITERATOR_FIELD_NAME,
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
  getPermissionList,
  SEO_FIELD_NAME,
} from "@rakun-kit/next";

import {
  Article,
  Author,
  CategoriesGallery,
  CategoriesGalleryItem,
  Category,
  Footer,
  FeatureCarousel,
  FeatureCarouselItem,
  Header,
  ImagePlayground,
  PreviewPage as Page,
  Project,
  PageSection,
  RelationLevel2,
  RelationLevel3,
  RelationPlayground,
} from "./content-types";

const now = () => new Date();
const translatable = (
  en: string,
  es = en,
  overrides: Record<string, string> = {},
) => ({
  _tag: "Translatable",
  en,
  es,
  ...overrides,
});
const seedLanguages = [
  { code: "en", name: "English", default: true },
  { code: "es", name: "Spanish", default: false },
  {
    code: "es-MX",
    name: "Spanish (Mexico)",
    default: false,
    parentCode: "es",
  },
] as const;
const seedLiteralTranslations = [
  {
    key: "demo.welcome",
    locale: "en",
    message: "EN literal override: welcome from the database.",
  },
  {
    key: "demo.welcome",
    locale: "es",
    message: "ES literal override: bienvenida desde la base de datos.",
  },
  {
    key: "test.hello",
    locale: "en",
    message: "EN client literal: hello, {name}.",
  },
  {
    key: "test.hello",
    locale: "es",
    message: "ES literal cliente: hola, {name}.",
  },
  {
    key: "test.goodbye",
    locale: "en",
    message: "EN server literal: goodbye, {name}.",
  },
  {
    key: "test.goodbye",
    locale: "es",
    message: "ES literal servidor: adios, {name}.",
  },
] as const;
const SEED_LOCKS = "_rakun_preview_seed_locks";
const SEED_LOCK_ID = "preview";
const SEED_LOCK_TTL_MS = 30_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isDuplicateKeyError = (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  "code" in error &&
  (error as { code?: number }).code === 11000;

type SeedLock = {
  _id: string;
  acquiredAt: Date;
};

const acquireSeedLock = async (db: Db) => {
  const locks = db.collection<SeedLock>(SEED_LOCKS);

  for (let attempt = 0; attempt < 300; attempt += 1) {
    await locks.deleteMany({
      _id: SEED_LOCK_ID,
      acquiredAt: { $lt: new Date(Date.now() - SEED_LOCK_TTL_MS) },
    });

    try {
      await locks.insertOne({
        _id: SEED_LOCK_ID,
        acquiredAt: new Date(),
      });
      return;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      await wait(100);
    }
  }

  throw new Error("Timed out waiting for preview seed lock.");
};

const releaseSeedLock = async (db: Db) => {
  await db.collection<SeedLock>(SEED_LOCKS).deleteOne({ _id: SEED_LOCK_ID });
};

const getDocumentId = (value: unknown) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id);
  }

  return String(value);
};

const getTranslatableValue = (
  value: unknown,
  languageCode: string,
  languages: readonly Document[] = [],
) => {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const codes: string[] = [];
    const seenLanguages = new Set<string>();
    let current = languages.find((item) => String(item.code) === languageCode);

    const pushCode = (code: unknown) => {
      if (typeof code === "string" && code.length > 0 && !codes.includes(code)) {
        codes.push(code);
      }
    };

    pushCode(languageCode);

    while (current && !seenLanguages.has(String(current._id))) {
      seenLanguages.add(String(current._id));
      const parentId = getDocumentId(current.parent);
      current = parentId
        ? languages.find((item) => String(item._id) === parentId)
        : undefined;
      pushCode(current?.code);
    }

    pushCode(languages.find((item) => item.default)?.code);
    pushCode("en");

    const localized = codes.map((code) => record[code]).find(Boolean);

    return typeof localized === "string" ? localized : "";
  }

  return typeof value === "string" ? value : "";
};

const getLanguagePathPrefix = (language: Document) =>
  language.default === true ? "" : String(language.code);

const buildPagePath = ({
  page,
  language,
  languages = [],
  home = false,
}: {
  page: Document;
  language: Document;
  languages?: readonly Document[];
  home?: boolean;
}) => {
  const code = String(language.code);
  const languagePrefix = getLanguagePathPrefix(language);

  if (home) {
    return `/${languagePrefix}/`.replace(/\/\/+/g, "/");
  }

  const slug = getTranslatableValue(page.slug, code, languages);

  return `/${languagePrefix}/${slug}/`.replace(/\/\/+/g, "/");
};

const buildLegacyPrefixedPagePath = ({
  page,
  language,
  languages = [],
  home = false,
}: {
  page: Document;
  language: Document;
  languages?: readonly Document[];
  home?: boolean;
}) => {
  const code = String(language.code);

  if (home) {
    return `/${code}/`;
  }

  const slug = getTranslatableValue(page.slug, code, languages);

  return `/${code}/${slug}/`.replace(/\/\/+/g, "/");
};

const buildProjectPath = ({
  project,
  language,
  languages = [],
}: {
  project: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const code = String(language.code);
  const languagePrefix = getLanguagePathPrefix(language);
  const slug = getTranslatableValue(project.slug, code, languages);

  return `/${languagePrefix}/projects/${slug}/`.replace(/\/\/+/g, "/");
};

const buildLegacyPrefixedProjectPath = ({
  project,
  language,
  languages = [],
}: {
  project: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const code = String(language.code);
  const slug = getTranslatableValue(project.slug, code, languages);

  return `/${code}/projects/${slug}/`.replace(/\/\/+/g, "/");
};

const buildCategoryPath = ({
  category,
  language,
  languages = [],
}: {
  category: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const languagePrefix = getLanguagePathPrefix(language);
  const slug = getTranslatableValue(category.slug, String(language.code), languages);

  return `/${languagePrefix}/categories/${slug}/`.replace(/\/\/+/g, "/");
};

const buildLegacyPrefixedCategoryPath = ({
  category,
  language,
  languages = [],
}: {
  category: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const code = String(language.code);
  const slug = getTranslatableValue(category.slug, code, languages);

  return `/${code}/categories/${slug}/`.replace(/\/\/+/g, "/");
};

const pageLink = (route: Document, page: Document) => ({
  routeId: route._id.toString(),
  contentTypeId: page._id.toString(),
});

const upsertPageRouteMap = async ({
  db,
  page,
  route,
  language,
  languages = [],
  home = false,
}: {
  db: Db;
  page: Document;
  route: Document;
  language: Document;
  languages?: readonly Document[];
  home?: boolean;
}) => {
  const path = buildPagePath({ page, language, languages, home });
  const variantGroupId = page[LOCALE_VARIANT_GROUP_FIELD] ?? page._id;
  const payload = {
    path,
    contentType: Page.name,
    contentTypeId: page._id,
    variantGroupId,
    routeId: route._id,
    languageId: language._id,
    lastModified: page.updatedAt ?? page.createdAt ?? now(),
    _type: "RouteMap",
    updatedAt: now(),
  };

  try {
    await db.collection("RouteMap").updateOne(
      { path },
      {
        $set: payload,
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    await db.collection("RouteMap").updateOne({ path }, { $set: payload });
  }
};

const upsertProjectRouteMap = async ({
  db,
  project,
  route,
  language,
  languages = [],
}: {
  db: Db;
  project: Document;
  route: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const path = buildProjectPath({ project, language, languages });
  const payload = {
    path,
    contentType: Project.name,
    contentTypeId: project._id,
    routeId: route._id,
    languageId: language._id,
    _type: "RouteMap",
    updatedAt: now(),
  };

  try {
    await db.collection("RouteMap").updateOne(
      { path },
      {
        $set: payload,
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    await db.collection("RouteMap").updateOne({ path }, { $set: payload });
  }
};

const upsertCategoryRouteMap = async ({
  db,
  category,
  route,
  language,
  languages = [],
}: {
  db: Db;
  category: Document;
  route: Document;
  language: Document;
  languages?: readonly Document[];
}) => {
  const path = buildCategoryPath({ category, language, languages });
  const payload = {
    path,
    contentType: Category.name,
    contentTypeId: category._id,
    routeId: route._id,
    languageId: language._id,
    _type: "RouteMap",
    updatedAt: now(),
  };

  try {
    await db.collection("RouteMap").updateOne(
      { path },
      {
        $set: payload,
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    await db.collection("RouteMap").updateOne({ path }, { $set: payload });
  }
};

const markPageLocaleVariant = async ({
  db,
  page,
  group,
  role,
}: {
  db: Db;
  page: Document;
  group: Document;
  role: "primary" | "variant";
}) => {
  const groupId = group._id;

  await db.collection(Page.name).updateOne(
    { _id: page._id },
    {
      $set: {
        [LOCALE_VARIANT_GROUP_FIELD]: groupId,
        [LOCALE_VARIANT_ROLE_FIELD]: role,
        updatedAt: now(),
      },
    },
  );

  page[LOCALE_VARIANT_GROUP_FIELD] = groupId;
  page[LOCALE_VARIANT_ROLE_FIELD] = role;
};

const upsertRouteLocaleVariant = async ({
  db,
  route,
  language,
  group,
  document,
}: {
  db: Db;
  route: Document;
  language: Document;
  group: Document;
  document: Document;
}) => {
  const payload = {
    routeId: route._id,
    routeKey: "page",
    contentType: Page.name,
    groupId: group._id,
    languageId: language._id,
    documentId: document._id,
    _type: RouteLocaleVariant.name,
    updatedAt: now(),
  };

  await db.collection(RouteLocaleVariant.name).updateOne(
    {
      routeId: route._id,
      groupId: group._id,
      languageId: language._id,
    },
    {
      $set: payload,
      $setOnInsert: {
        createdAt: now(),
      },
    },
    { upsert: true },
  );
};

const resolveSeedPageVariant = ({
  primary,
  assignments,
  language,
  languages,
}: {
  primary: Document;
  assignments: Array<{ language: Document; document: Document }>;
  language: Document;
  languages: readonly Document[];
}) => {
  const seenLanguages = new Set<string>();
  let current: Document | undefined = language;

  while (current && !seenLanguages.has(String(current._id))) {
    seenLanguages.add(String(current._id));
    const assignment = assignments.find(
      (item) => String(item.language._id) === String(current?._id),
    );

    if (assignment) {
      return assignment.document;
    }

    const parentId = getDocumentId(current.parent);
    current = parentId
      ? languages.find((item) => String(item._id) === parentId)
      : undefined;
  }

  const defaultLanguage = languages.find((item) => item.default);
  const defaultAssignment = assignments.find(
    (item) => String(item.language._id) === String(defaultLanguage?._id),
  );

  return defaultAssignment?.document ?? primary;
};

const richText = (text: string) => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            type: "text",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
});

const richTextWithCode = ({
  intro,
  code,
  language,
}: {
  intro: string;
  code: string;
  language: string;
}) => {
  const paragraph = richText(intro).root.children[0];

  return {
    root: {
      children: [
        paragraph,
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: code,
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          language,
          type: "code",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
};

const existingRelation = (contentType: string, document: Document) => ({
  type: "existing",
  contentType,
  _id: document._id,
});

const nestedCallout = ({
  title,
  existingArticle,
  flexibleArticle = existingArticle,
  contributors,
}: {
  title: string;
  existingArticle: Document;
  flexibleArticle?: Document;
  contributors: Document[];
}) => ({
  type: "new",
  data: {
    _type: RelationLevel3.name,
    title,
    existingArticle: existingRelation(Article.name, existingArticle),
    flexibleArticle: existingRelation(Article.name, flexibleArticle),
    authors: contributors.map((contributor) =>
      existingRelation(Author.name, contributor),
    ),
  },
});

const previewSeo = (title = "Home", description = "page-1") => ({
  type: "new",
  data: {
    _type: Seo.name,
    title: translatable(title),
    description: translatable(description),
  },
});

const previewHelloWorldModule = (
  enText = "Hello Preview",
  esText = enText,
  overrides: Record<string, string> = {},
) => ({
  name: HelloWorld.name,
  value: {
    type: "new",
    data: {
      _type: HelloWorld.name,
      text: translatable(enText, esText, overrides),
    },
  },
});

const previewFeatureCarouselModule = (featuredProject: Document) => ({
  name: FeatureCarousel.name,
  value: {
    type: "new",
    data: {
      _type: FeatureCarousel.name,
      eyebrow: "Dynamic data module",
      title: "Fallback carousel title",
      items: [],
      _bindings: {
        fields: {
          title: {
            contentType: Project.name,
            id: featuredProject._id.toString(),
            path: "title",
          },
        },
        lists: {
          items: {
            contentType: Project.name,
            itemName: FeatureCarouselItem.name,
            query: {
              filter: {
                featured: true,
              },
              options: {
                limit: 3,
                sort: {
                  title: "asc",
                },
              },
            },
            map: {
              title: {
                contentType: Project.name,
                path: "title",
              },
              summary: {
                contentType: Project.name,
                path: "excerpt",
              },
              href: {
                contentType: Project.name,
                virtual: "href",
                routeKey: "project",
              },
            },
          },
        },
      },
    },
  },
});

const previewCategoriesGalleryModule = () => ({
  name: CategoriesGallery.name,
  value: {
    type: "new",
    data: {
      _type: CategoriesGallery.name,
      eyebrow: "Related collection mapping",
      title: "Project images grouped by category",
      items: [],
      _bindings: {
        lists: {
          items: {
            contentType: Category.name,
            itemName: CategoriesGalleryItem.name,
            query: {
              options: {
                limit: 10,
                sort: {
                  title: "asc",
                },
              },
            },
            map: {
              title: {
                contentType: Category.name,
                path: "title",
              },
              href: {
                contentType: Category.name,
                virtual: "href",
                routeKey: "category",
              },
              images: {
                kind: "relatedCollection",
                contentType: Project.name,
                relation: "category",
                path: "images",
                limit: 10,
                sort: {
                  title: "asc",
                },
              },
            },
          },
        },
      },
    },
  },
});

const seedLiterals = async (db: Db) => {
  await db.collection(LiteralTranslation.name).bulkWrite(
    seedLiteralTranslations.map((literal) => ({
      updateOne: {
        filter: {
          key: literal.key,
          locale: literal.locale,
        },
        update: {
          $set: {
            message: literal.message,
            updatedAt: now(),
          },
          $setOnInsert: {
            key: literal.key,
            locale: literal.locale,
            _type: LiteralTranslation.name,
            createdAt: now(),
          },
        },
        upsert: true,
      },
    })),
  );
};

const seedAuthors = async (db: Db) => {
  const timestamp = now();

  await db.collection(Author.name).bulkWrite(
    Array.from({ length: 100 }, (_, index) => {
      const authorIndex = index + 1;

      return {
        updateOne: {
          filter: { email: `author-${authorIndex}@example.com` },
          update: {
            $setOnInsert: {
              name: `Author-${authorIndex}`,
              email: `author-${authorIndex}@example.com`,
              bio: `Seed author ${authorIndex} for pagination testing.`,
              _type: Author.name,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          upsert: true,
        },
      };
    }),
  );
};

type SeedPreviewDataOptions = {
  mongoUri: string;
  adminEmail?: string;
  adminName?: string;
  adminPassword?: string;
  enabled?: boolean;
};

export const seedPreviewData = async ({
  mongoUri,
  adminEmail = "admin@rakun.local",
  adminName = "Preview Admin",
  adminPassword = "admin1234",
  enabled = true,
}: SeedPreviewDataOptions) => {
  if (!enabled) {
    return;
  }

  const client = await MongoClient.connect(mongoUri);
  const db = client.db(mongoUri.split("/").pop()?.split("?")[0]);
  let lockAcquired = false;

  try {
    await acquireSeedLock(db);
    lockAcquired = true;

    for (const language of seedLanguages) {
      const parentCode = "parentCode" in language ? language.parentCode : null;
      const parent = parentCode
        ? await db.collection("Language").findOne({ code: parentCode })
        : null;

      await db.collection("Language").updateOne(
        { code: language.code },
        {
          $set: {
            code: language.code,
            name: language.name,
            default: language.default,
            ...(parent
              ? {
                  parent: {
                    type: "self",
                    contentType: "Language",
                    _id: parent._id,
                  },
                }
              : {}),
            _type: "Language",
            updatedAt: now(),
          },
          ...(parent ? {} : { $unset: { parent: "" } }),
          $setOnInsert: {
            createdAt: now(),
          },
        },
        { upsert: true },
      );
    }

    await seedLiterals(db);

    const language = await db.collection("Language").findOne({ code: "en" });

    if (!language) {
      throw new Error("Failed to create preview language.");
    }

    const adminPermissions = getPermissionList();
    const role = await db.collection("ManagerRole").findOneAndUpdate(
      { name: "Preview Admin" },
      {
        $set: {
          permissions: adminPermissions,
          updatedAt: now(),
        },
        $setOnInsert: {
          name: "Preview Admin",
          _type: "ManagerRole",
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!role) {
      throw new Error("Failed to create preview admin role.");
    }

    await db.collection("ManagerUser").updateOne(
      { email: adminEmail },
      {
        $setOnInsert: {
          user: adminName,
          email: adminEmail,
          password: bcrypt.hashSync(adminPassword, 10),
          role: {
            type: "existing",
            contentType: "ManagerRole",
            _id: role._id,
          },
          twoFactorEnabled: false,
          _type: "ManagerUser",
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true },
    );

    const header = await db.collection(Header.name).findOneAndUpdate(
      { brand: "Rakun Preview" },
      {
        $set: {
          primaryLinkLabel: "Backend",
          primaryLinkHref: "http://localhost:3000/backend",
          updatedAt: now(),
        },
        $setOnInsert: {
          brand: "Rakun Preview",
          _type: Header.name,
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!header) {
      throw new Error("Failed to create preview header.");
    }

    const footer = await db.collection(Footer.name).findOneAndUpdate(
      { brand: "Rakun Preview" },
      {
        $set: {
          copyright: "2026 Rakun Preview",
          primaryLinkLabel: "Docs",
          primaryLinkHref: "http://localhost:3000/backend/settings/routes",
          updatedAt: now(),
        },
        $setOnInsert: {
          brand: "Rakun Preview",
          _type: Footer.name,
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!footer) {
      throw new Error("Failed to create preview footer.");
    }

    const pageSection = await db.collection(PageSection.name).findOneAndUpdate(
      { "title.en": "Hello Preview" },
      {
        $setOnInsert: {
          title: translatable("Hello Preview"),
          body: translatable("<p>Seeded page content for preview routes.</p>"),
          _type: PageSection.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!pageSection) {
      throw new Error("Failed to create preview page section.");
    }

    const seededCategories = await Promise.all(
      [
        { title: "Launch campaigns", slug: "launch-campaigns" },
        { title: "Creative studios", slug: "creative-studios" },
      ].map((category) =>
        db.collection(Category.name).findOneAndUpdate(
          { slug: category.slug },
          {
            $set: {
              title: category.title,
              updatedAt: now(),
            },
            $setOnInsert: {
              slug: category.slug,
              _type: Category.name,
              createdAt: now(),
            },
          },
          { upsert: true, returnDocument: "after" },
        ),
      ),
    );
    const categories = seededCategories.filter(Boolean) as Array<
      NonNullable<(typeof seededCategories)[number]>
    >;
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

    if (categories.length !== seededCategories.length) {
      throw new Error("Failed to create preview categories.");
    }

    const galleryMediaSources = [
      { key: "public/dynamic-data/aurora.svg", name: "Aurora gradients" },
      { key: "public/dynamic-data/borealis.svg", name: "Borealis forms" },
      { key: "public/dynamic-data/canopy.svg", name: "Canopy composition" },
      { key: "public/dynamic-data/ember.svg", name: "Ember landscape" },
      { key: "public/dynamic-data/lagoon.svg", name: "Lagoon geometry" },
      { key: "public/dynamic-data/studio.svg", name: "Studio still life" },
    ];
    const galleryMediaDefinitions = galleryMediaSources.flatMap((media) =>
      Array.from({ length: 3 }, (_, index) => {
        const copy = index + 1;
        const key =
          copy === 1
            ? media.key
            : media.key.replace(/\.svg$/, `-copy-${copy}.svg`);

        return {
          key,
          name: `${media.name} - copy ${copy}`,
          sourceKey: media.key,
          sourceUrl: `/${media.key.replace(/^public\//, "")}`,
        };
      }),
    );
    const seededGalleryMedia = await Promise.all(
      galleryMediaDefinitions.map((media) =>
        db.collection(Media.name).findOneAndUpdate(
          { key: media.key },
          {
            $set: {
              name: media.name,
              title: media.name,
              alt: media.name,
              originalName: media.key.split("/").at(-1),
              url: media.sourceUrl,
              previewKey: media.sourceKey,
              previewUrl: media.sourceUrl,
              previewMime: "image/svg+xml",
              access: "public",
              mime: "image/svg+xml",
              extension: "svg",
              size: 0,
              width: 1200,
              height: 900,
              orientation: "landscape",
              status: "uploaded",
              updatedAt: now(),
            },
            $setOnInsert: {
              key: media.key,
              uploadedAt: now(),
              _type: Media.name,
              createdAt: now(),
            },
          },
          { upsert: true, returnDocument: "after" },
        ),
      ),
    );
    const galleryMedia = seededGalleryMedia.filter(Boolean) as Array<
      NonNullable<(typeof seededGalleryMedia)[number]>
    >;
    const galleryMediaByKey = new Map(galleryMedia.map((media) => [media.key, media]));

    if (galleryMedia.length !== seededGalleryMedia.length) {
      throw new Error("Failed to create preview gallery media.");
    }

    const categoryRelation = (slug: string) => {
      const category = categoryBySlug.get(slug);
      if (!category) throw new Error(`Missing preview category: ${slug}`);
      return existingRelation(Category.name, category);
    };
    const imageRelation = (key: string) => {
      const media = galleryMediaByKey.get(key);
      if (!media) throw new Error(`Missing preview gallery media: ${key}`);
      return existingRelation(Media.name, media);
    };

    const imagePlaygroundMedia = galleryMediaDefinitions.map(
      (media) => media.key,
    );
    const imagePlayground = await db
      .collection(ImagePlayground.name)
      .findOneAndUpdate(
        { title: "Multiple image performance" },
        {
          $set: {
            singleImage: imageRelation(imagePlaygroundMedia[0]),
            multipleImages: imagePlaygroundMedia.map(imageRelation),
            updatedAt: now(),
          },
          $setOnInsert: {
            title: "Multiple image performance",
            _type: ImagePlayground.name,
            createdAt: now(),
          },
        },
        { upsert: true, returnDocument: "after" },
      );

    if (!imagePlayground) {
      throw new Error("Failed to create preview image playground.");
    }

    const seededProjects = await Promise.all(
      [
        {
          title: "Aurora launch",
          slug: "aurora-launch",
          excerpt: "Routeable source item used by the dynamic carousel title.",
          featured: true,
          category: "launch-campaigns",
          images: ["public/dynamic-data/aurora.svg", "public/dynamic-data/borealis.svg"],
        },
        {
          title: "Borealis workspace",
          slug: "borealis-workspace",
          excerpt: "Featured project mapped into carousel item summary.",
          featured: true,
          category: "launch-campaigns",
          images: ["public/dynamic-data/borealis.svg", "public/dynamic-data/canopy.svg"],
        },
        {
          title: "Canopy studio",
          slug: "canopy-studio",
          excerpt: "Third featured project for list binding limits and hrefs.",
          featured: true,
          category: "creative-studios",
          images: ["public/dynamic-data/canopy.svg", "public/dynamic-data/aurora.svg"],
        },
        {
          title: "Draft lab",
          slug: "draft-lab",
          excerpt: "Non-featured project kept out by the binding filter.",
          featured: false,
          category: "creative-studios",
          images: ["public/dynamic-data/studio.svg"],
        },
      ].map((project) =>
        db.collection(Project.name).findOneAndUpdate(
          { slug: project.slug },
          {
            $set: {
              title: project.title,
              excerpt: project.excerpt,
              featured: project.featured,
              category: categoryRelation(project.category),
              images: project.images.map(imageRelation),
              updatedAt: now(),
            },
            $setOnInsert: {
              slug: project.slug,
              _type: Project.name,
              createdAt: now(),
            },
          },
          { upsert: true, returnDocument: "after" },
        ),
      ),
    );
    const projects = seededProjects.filter(Boolean) as Array<
      NonNullable<(typeof seededProjects)[number]>
    >;
    const featuredProject = projects[0];

    if (!featuredProject || projects.length !== seededProjects.length) {
      throw new Error("Failed to create preview projects.");
    }

    const page = await db.collection(Page.name).findOneAndUpdate(
      { "slug.en": "home" },
      {
        $setOnInsert: {
          title: translatable("Home", "Inicio"),
          slug: translatable("home", "inicio"),
          [SEO_FIELD_NAME]: previewSeo(),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule(),
            previewFeatureCarouselModule(featuredProject),
            previewCategoriesGalleryModule(),
          ],
          _type: Page.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!page) {
      throw new Error("Failed to create preview page.");
    }

    const aboutPage = await db.collection(Page.name).findOneAndUpdate(
      { "slug.en": "about" },
      {
        $setOnInsert: {
          title: translatable("About", "Sobre"),
          slug: translatable("about", "sobre"),
          [SEO_FIELD_NAME]: previewSeo("About", "Internal link target page."),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule("About link target", "Destino Sobre"),
          ],
          _type: Page.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!aboutPage) {
      throw new Error("Failed to create preview about page.");
    }

    const contactPage = await db.collection(Page.name).findOneAndUpdate(
      { "slug.en": "contact" },
      {
        $setOnInsert: {
          title: translatable("Contact", "Contacto"),
          slug: translatable("contact", "contacto"),
          [SEO_FIELD_NAME]: previewSeo(
            "Contact",
            "Second internal link target page.",
          ),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule("Contact link target", "Destino Contacto"),
          ],
          _type: Page.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!contactPage) {
      throw new Error("Failed to create preview contact page.");
    }

    await Promise.all([
      markPageLocaleVariant({ db, page, group: page, role: "primary" }),
      markPageLocaleVariant({
        db,
        page: aboutPage,
        group: aboutPage,
        role: "primary",
      }),
      markPageLocaleVariant({
        db,
        page: contactPage,
        group: contactPage,
        role: "primary",
      }),
    ]);

    const aboutSpanishPage = await db.collection(Page.name).findOneAndUpdate(
      {
        [LOCALE_VARIANT_ROLE_FIELD]: "variant",
        "slug.en": "about-es",
        $or: [
          { [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id },
          { [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id.toString() },
        ],
      },
      {
        $set: {
          title: translatable("About Spanish", "Sobre"),
          slug: translatable("about-es", "sobre"),
          [SEO_FIELD_NAME]: previewSeo(
            "Sobre",
            "Generic Spanish locale variant.",
          ),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule(
              "Generic Spanish about variant",
              "Variante Sobre en espanol",
            ),
          ],
          [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id,
          [LOCALE_VARIANT_ROLE_FIELD]: "variant",
          _type: Page.name,
          updatedAt: now(),
        },
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!aboutSpanishPage) {
      throw new Error("Failed to create preview Spanish about page variant.");
    }

    const aboutMexicoPage = await db.collection(Page.name).findOneAndUpdate(
      {
        [LOCALE_VARIANT_ROLE_FIELD]: "variant",
        "slug.en": "about-mx",
        $or: [
          { [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id },
          { [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id.toString() },
        ],
      },
      {
        $set: {
          title: translatable("About Mexico", "Sobre Mexico", {
            "es-MX": "Sobre Mexico",
          }),
          slug: translatable("about-mx", "sobre-mexico", {
            "es-MX": "sobre-mexico",
          }),
          [SEO_FIELD_NAME]: previewSeo(
            "Sobre Mexico",
            "Mexico-specific locale variant.",
          ),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule(
              "Mexico-specific about variant",
              "Variante Sobre Mexico",
              {
                "es-MX": "Variante Sobre Mexico",
              },
            ),
          ],
          [LOCALE_VARIANT_GROUP_FIELD]: aboutPage._id,
          [LOCALE_VARIANT_ROLE_FIELD]: "variant",
          _type: Page.name,
          updatedAt: now(),
        },
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!aboutMexicoPage) {
      throw new Error("Failed to create preview Mexico about page variant.");
    }

    const contactSpanishPage = await db.collection(Page.name).findOneAndUpdate(
      {
        [LOCALE_VARIANT_ROLE_FIELD]: "variant",
        "slug.en": "contact-es",
        $or: [
          { [LOCALE_VARIANT_GROUP_FIELD]: contactPage._id },
          { [LOCALE_VARIANT_GROUP_FIELD]: contactPage._id.toString() },
        ],
      },
      {
        $set: {
          title: translatable("Contact Spanish", "Contacto"),
          slug: translatable("contact-es", "contacto"),
          [SEO_FIELD_NAME]: previewSeo(
            "Contacto",
            "Generic Spanish contact variant used by es-MX fallback.",
          ),
          [ITERATOR_FIELD_NAME]: [
            previewHelloWorldModule(
              "Generic Spanish contact variant",
              "Variante Contacto en espanol",
            ),
          ],
          [LOCALE_VARIANT_GROUP_FIELD]: contactPage._id,
          [LOCALE_VARIANT_ROLE_FIELD]: "variant",
          _type: Page.name,
          updatedAt: now(),
        },
        $setOnInsert: {
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!contactSpanishPage) {
      throw new Error("Failed to create preview Spanish contact page variant.");
    }

    await db.collection(Page.name).updateOne(
      { _id: page._id, [SEO_FIELD_NAME]: { $exists: false } },
      {
        $set: {
          [SEO_FIELD_NAME]: previewSeo(),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${SEO_FIELD_NAME}.type`]: "new",
        [`${SEO_FIELD_NAME}.data.title`]: { $exists: false },
      },
      {
        $set: {
          [`${SEO_FIELD_NAME}.data.title`]: translatable("Home"),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${SEO_FIELD_NAME}.type`]: "new",
        [`${SEO_FIELD_NAME}.data.title`]: "Home",
      },
      {
        $set: {
          [`${SEO_FIELD_NAME}.data.title`]: translatable("Home"),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        $or: [
          { [ITERATOR_FIELD_NAME]: { $exists: false } },
          { [ITERATOR_FIELD_NAME]: { $size: 0 } },
        ],
      },
      {
        $set: {
          [ITERATOR_FIELD_NAME]: [previewHelloWorldModule()],
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${ITERATOR_FIELD_NAME}.name`]: HelloWorld.name,
        [`${ITERATOR_FIELD_NAME}.value.data.text`]: "Hello Preview",
      },
      {
        $set: {
          [`${ITERATOR_FIELD_NAME}.$[module].value.data.text`]:
            translatable("Hello Preview"),
          updatedAt: now(),
        },
      },
      {
        arrayFilters: [
          {
            "module.name": HelloWorld.name,
            "module.value.type": "new",
            "module.value.data.text": "Hello Preview",
          },
        ],
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${ITERATOR_FIELD_NAME}.name`]: { $ne: FeatureCarousel.name },
      },
      {
        $push: {
          [ITERATOR_FIELD_NAME]: previewFeatureCarouselModule(featuredProject),
        },
        $set: {
          updatedAt: now(),
        },
      } as Document,
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${ITERATOR_FIELD_NAME}.name`]: FeatureCarousel.name,
      },
      {
        $set: {
          [`${ITERATOR_FIELD_NAME}.$[module].value`]:
            previewFeatureCarouselModule(featuredProject).value,
          updatedAt: now(),
        },
      },
      {
        arrayFilters: [
          {
            "module.name": FeatureCarousel.name,
          },
        ],
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${ITERATOR_FIELD_NAME}.name`]: { $ne: CategoriesGallery.name },
      },
      {
        $push: {
          [ITERATOR_FIELD_NAME]: previewCategoriesGalleryModule(),
        },
        $set: {
          updatedAt: now(),
        },
      } as Document,
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        [`${ITERATOR_FIELD_NAME}.name`]: CategoriesGallery.name,
      },
      {
        $set: {
          [`${ITERATOR_FIELD_NAME}.$[module].value`]: previewCategoriesGalleryModule().value,
          updatedAt: now(),
        },
      },
      {
        arrayFilters: [
          {
            "module.name": CategoriesGallery.name,
          },
        ],
      },
    );

    const route = await db.collection("Route").findOne({
      contentType: Page.name,
      field: "slug",
    });
    const projectRoute = await db.collection("Route").findOne({
      contentType: Project.name,
      field: "slug",
    });
    const categoryRoute = await db.collection("Route").findOne({
      contentType: Category.name,
      field: "slug",
    });

    if (route) {
      await db.collection("RouteLayoutModule").updateOne(
        { routeId: route._id, key: "header" },
        {
          $set: {
            moduleId: header._id.toString(),
            updatedAt: now(),
          },
        },
      );

      await db.collection("RouteLayoutModule").updateOne(
        { routeId: route._id, key: "footer" },
        {
          $set: {
            moduleId: footer._id.toString(),
            updatedAt: now(),
          },
        },
      );

      await db.collection("RouteSettings").updateOne(
        { key: "default" },
        {
          $set: {
            key: "default",
            homePage: {
              type: "existing",
              contentType: Page.name,
              _id: page._id.toString(),
            },
            _type: "RouteSettings",
            updatedAt: now(),
          },
          $setOnInsert: {
            createdAt: now(),
          },
        },
        { upsert: true },
      );

      const languages = await db.collection("Language").find({}).toArray();
      const languageByCode = new Map(
        languages.map((routeLanguage) => [
          String(routeLanguage.code),
          routeLanguage,
        ]),
      );
      const enLanguage = languageByCode.get("en");
      const esLanguage = languageByCode.get("es");
      const esMxLanguage = languageByCode.get("es-MX");

      if (!enLanguage || !esLanguage || !esMxLanguage) {
        throw new Error("Failed to load preview locale languages.");
      }

      const pageVariantGroups = [
        {
          primary: page,
          home: true,
          assignments: [
            { language: enLanguage, document: page },
            { language: esLanguage, document: page },
          ],
        },
        {
          primary: aboutPage,
          home: false,
          assignments: [
            { language: enLanguage, document: aboutPage },
            { language: esLanguage, document: aboutSpanishPage },
            { language: esMxLanguage, document: aboutMexicoPage },
          ],
        },
        {
          primary: contactPage,
          home: false,
          assignments: [
            { language: enLanguage, document: contactPage },
            { language: esLanguage, document: contactSpanishPage },
          ],
        },
      ];

      await Promise.all(
        pageVariantGroups.flatMap((group) =>
          group.assignments.map((assignment) =>
            upsertRouteLocaleVariant({
              db,
              route,
              group: group.primary,
              language: assignment.language,
              document: assignment.document,
            }),
          ),
        ),
      );

      const legacyDefaultLanguagePaths = Array.from(
        new Set(
          languages
            .filter((routeLanguage) => routeLanguage.default === true)
            .flatMap((routeLanguage) => [
              ...pageVariantGroups.map((group) =>
                buildLegacyPrefixedPagePath({
                  page: resolveSeedPageVariant({
                    primary: group.primary,
                    assignments: group.assignments,
                    language: routeLanguage,
                    languages,
                  }),
                  language: routeLanguage,
                  languages,
                  home: group.home,
                }),
              ),
              ...(projectRoute
                ? projects.map((project) =>
                    buildLegacyPrefixedProjectPath({
                      project,
                      language: routeLanguage,
                      languages,
                    }),
                  )
                : []),
              ...(categoryRoute
                ? categories.map((category) =>
                    buildLegacyPrefixedCategoryPath({
                      category,
                      language: routeLanguage,
                      languages,
                    }),
                  )
                : []),
            ]),
        ),
      );

      if (legacyDefaultLanguagePaths.length > 0) {
        await db.collection("RouteMap").deleteMany({
          path: { $in: legacyDefaultLanguagePaths },
          routeId: {
            $in: [
              route._id,
              ...(projectRoute ? [projectRoute._id] : []),
              ...(categoryRoute ? [categoryRoute._id] : []),
            ],
          },
        });
      }

      await Promise.all(
        languages.flatMap((routeLanguage) => [
          ...pageVariantGroups.map((group) =>
            upsertPageRouteMap({
              db,
              page: resolveSeedPageVariant({
                primary: group.primary,
                assignments: group.assignments,
                language: routeLanguage,
                languages,
              }),
              route,
              language: routeLanguage,
              languages,
              home: group.home,
            }),
          ),
          ...(projectRoute
            ? projects.map((project) =>
                upsertProjectRouteMap({
                  db,
                  project,
                  route: projectRoute,
                  language: routeLanguage,
                  languages,
                }),
              )
            : []),
          ...(categoryRoute
            ? categories.map((category) =>
                upsertCategoryRouteMap({
                  db,
                  category,
                  route: categoryRoute,
                  language: routeLanguage,
                  languages,
                }),
              )
            : []),
        ]),
      );

      if (projectRoute) {
        await db.collection("RouteLayoutModule").updateOne(
          { routeId: projectRoute._id, key: "header" },
          {
            $set: {
              moduleId: header._id.toString(),
              updatedAt: now(),
            },
          },
        );

        await db.collection("RouteLayoutModule").updateOne(
          { routeId: projectRoute._id, key: "footer" },
          {
            $set: {
              moduleId: footer._id.toString(),
              updatedAt: now(),
            },
          },
        );
      }

      if (categoryRoute) {
        await db.collection("RouteLayoutModule").updateOne(
          { routeId: categoryRoute._id, key: "header" },
          {
            $set: {
              moduleId: header._id.toString(),
              updatedAt: now(),
            },
          },
        );

        await db.collection("RouteLayoutModule").updateOne(
          { routeId: categoryRoute._id, key: "footer" },
          {
            $set: {
              moduleId: footer._id.toString(),
              updatedAt: now(),
            },
          },
        );
      }

      await db.collection(Header.name).updateOne(
        { _id: header._id },
        {
          $set: {
            internalLinkLabel: "About",
            internalLink: pageLink(route, aboutPage),
            updatedAt: now(),
          },
        },
      );

      await db.collection(Footer.name).updateOne(
        { _id: footer._id },
        {
          $set: {
            internalLinkLabel: "Rakun on GitHub",
            internalLink: "https://github.com/Yelsier/rakun",
            updatedAt: now(),
          },
        },
      );
    }

    const author = await db.collection(Author.name).findOneAndUpdate(
      { email: "ada@example.com" },
      {
        $setOnInsert: {
          name: "Ada Lovelace",
          email: "ada@example.com",
          bio: "Preview author seeded for local manager development.",
          _type: Author.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!author) {
      throw new Error("Failed to create preview author.");
    }

    const editor = await db.collection(Author.name).findOneAndUpdate(
      { email: "grace@example.com" },
      {
        $setOnInsert: {
          name: "Grace Hopper",
          email: "grace@example.com",
          bio: "Relation fixture author.",
          _type: Author.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!editor) {
      throw new Error("Failed to create preview editor.");
    }

    await seedAuthors(db);

    await db.collection(Article.name).updateOne(
      {
        slug: "hello-preview",
        body: "<p>Edit manager-react and Vite will update this UI.</p>",
      },
      {
        $set: {
          body: richText("Edit manager-react and Next.js will update this UI."),
          updatedAt: now(),
        },
      },
    );

    const helloArticle = await db.collection(Article.name).findOneAndUpdate(
      { slug: "hello-preview" },
      {
        $setOnInsert: {
          title: "Hello Preview",
          slug: "hello-preview",
          excerpt: "Seeded content for manager-react hot reload.",
          published: true,
          author: {
            type: "existing",
            contentType: Author.name,
            _id: author._id,
          },
          body: richText("Edit manager-react and Next.js will update this UI."),
          tags: ["preview", "manager-react"],
          _type: Article.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!helloArticle) {
      throw new Error("Failed to create preview article.");
    }

    const codeArticle = await db.collection(Article.name).findOneAndUpdate(
      { slug: "lexical-code-blocks" },
      {
        $setOnInsert: {
          title: "Lexical Code Blocks",
          slug: "lexical-code-blocks",
          excerpt: "RichText code blocks provided by a Rakun manager plugin.",
          published: true,
          author: existingRelation(Author.name, author),
          body: richTextWithCode({
            intro: "Edit this code block, change its language, and save the article.",
            code: "type Greeting = { name: string }\n\nexport const greet = ({ name }: Greeting) => `Hello, ${name}!`",
            language: "typescript",
          }),
          tags: ["lexical", "plugins", "code"],
          _type: Article.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!codeArticle) {
      throw new Error("Failed to create Lexical code block article.");
    }

    const relationsArticle = await db.collection(Article.name).findOneAndUpdate(
      { slug: "nested-relations" },
      {
        $setOnInsert: {
          title: "Relation Target A",
          slug: "nested-relations",
          excerpt: "Relation fixture target.",
          published: true,
          author: existingRelation(Author.name, editor),
          body: richText("Target A."),
          tags: ["relations"],
          _type: Article.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!relationsArticle) {
      throw new Error("Failed to create nested relations article.");
    }

    const workflowArticle = await db.collection(Article.name).findOneAndUpdate(
      { slug: "manager-workflows" },
      {
        $setOnInsert: {
          title: "Relation Target B",
          slug: "manager-workflows",
          excerpt: "Relation fixture target.",
          published: true,
          author: existingRelation(Author.name, author),
          body: richText("Target B."),
          tags: ["relations"],
          _type: Article.name,
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!workflowArticle) {
      throw new Error("Failed to create manager workflows article.");
    }

    const level2 = await db.collection(RelationLevel2.name).findOneAndUpdate(
      { title: "Level 2 fixture" },
      {
        $set: {
          existingArticle: existingRelation(Article.name, relationsArticle),
          flexibleArticle: existingRelation(Article.name, helloArticle),
          existingArticles: [
            existingRelation(Article.name, helloArticle),
            existingRelation(Article.name, workflowArticle),
          ],
          inlineItems: [
            nestedCallout({
              title: "Level 3 fixture",
              existingArticle: workflowArticle,
              contributors: [author, editor],
            }),
          ],
          updatedAt: now(),
        },
        $setOnInsert: {
          title: "Level 2 fixture",
          _type: RelationLevel2.name,
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (!level2) {
      throw new Error("Failed to create relation level 2 fixture.");
    }

    await db.collection(RelationLevel2.name).updateOne(
      { _id: level2._id },
      {
        $set: {
          self: {
            type: "self",
            contentType: RelationLevel2.name,
            _id: level2._id,
          },
          updatedAt: now(),
        },
      },
    );

    await db.collection(RelationPlayground.name).findOneAndUpdate(
      { slug: "relations-fixture" },
      {
        $set: {
          title: "Relations fixture",
          existingAuthor: existingRelation(Author.name, author),
          flexibleArticle: existingRelation(Article.name, relationsArticle),
          existingLevel2: existingRelation(RelationLevel2.name, level2),
          existingLevel2List: [existingRelation(RelationLevel2.name, level2)],
          inlineLevel3: nestedCallout({
            title: "Inline level 3",
            existingArticle: relationsArticle,
            contributors: [editor],
          }),
          sections: [
            {
              name: "level2",
              value: existingRelation(RelationLevel2.name, level2),
            },
            {
              name: "article",
              value: existingRelation(Article.name, helloArticle),
            },
            {
              name: "level3",
              value: nestedCallout({
                title: "Block level 3",
                existingArticle: workflowArticle,
                contributors: [author, editor],
              }),
            },
          ],
          updatedAt: now(),
        },
        $setOnInsert: {
          slug: "relations-fixture",
          _type: RelationPlayground.name,
          createdAt: now(),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    console.log(`[preview-next] seeded admin ${adminEmail} / ${adminPassword}`);
  } finally {
    if (lockAcquired) {
      await releaseSeedLock(db);
    }
    await client.close();
  }
};
