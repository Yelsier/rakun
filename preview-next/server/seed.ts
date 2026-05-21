import bcrypt from "bcrypt";
import { MongoClient, type Db, type Document } from "mongodb";
import { Page, HelloWorld, Seo } from "@rakun-kit/next/internal-content-types";
import { PermissionsList } from "@rakun-kit/next";

import {
  Article,
  Author,
  Footer,
  Header,
  PageSection,
  RelationLevel2,
  RelationLevel3,
  RelationPlayground,
} from "./content-types";

const now = () => new Date();
const translatable = (value: string) => ({ _tag: "Translatable", en: value });
const seedLanguages = [
  { code: "en", name: "English", default: true },
  { code: "es", name: "Spanish", default: false },
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

const upsertHomeRouteMap = async ({
  db,
  page,
  route,
  language,
}: {
  db: Db;
  page: Document;
  route: Document;
  language: Document;
}) => {
  const path = "/en/";
  const payload = {
    path,
    contentType: Page.name,
    contentTypeId: page._id.toString(),
    routeId: route._id.toString(),
    languageId: language._id.toString(),
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

const previewSeo = () => ({
  type: "new",
  data: {
    _type: Seo.name,
    title: translatable("Home"),
    description: translatable("page-1"),
  },
});

const previewHelloWorldModule = () => ({
  name: HelloWorld.name,
  value: {
    type: "new",
    data: {
      _type: HelloWorld.name,
      text: translatable("Hello Preview"),
    },
  },
});

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
      await db.collection("Language").updateOne(
        { code: language.code },
        {
          $setOnInsert: {
            ...language,
            _type: "Language",
            createdAt: now(),
            updatedAt: now(),
          },
        },
        { upsert: true },
      );
    }

    const language = await db.collection("Language").findOne({ code: "en" });

    if (!language) {
      throw new Error("Failed to create preview language.");
    }

    const role = await db.collection("ManagerRole").findOneAndUpdate(
      { name: "Preview Admin" },
      {
        $setOnInsert: {
          name: "Preview Admin",
          permissions: [...PermissionsList],
          _type: "ManagerRole",
          createdAt: now(),
          updatedAt: now(),
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

    const page = await db.collection(Page.name).findOneAndUpdate(
      { "slug.en": "home" },
      {
        $setOnInsert: {
          title: translatable("Home"),
          slug: translatable("home"),
          seo: previewSeo(),
          iterator: [previewHelloWorldModule()],
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

    await db.collection(Page.name).updateOne(
      { _id: page._id, seo: { $exists: false } },
      {
        $set: {
          seo: previewSeo(),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        "seo.type": "new",
        "seo.data.title": { $exists: false },
      },
      {
        $set: {
          "seo.data.title": translatable("Home"),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        "seo.type": "new",
        "seo.data.title": "Home",
      },
      {
        $set: {
          "seo.data.title": translatable("Home"),
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        $or: [{ iterator: { $exists: false } }, { iterator: { $size: 0 } }],
      },
      {
        $set: {
          iterator: [previewHelloWorldModule()],
          updatedAt: now(),
        },
      },
    );

    await db.collection(Page.name).updateOne(
      {
        _id: page._id,
        "iterator.name": HelloWorld.name,
        "iterator.value.data.text": "Hello Preview",
      },
      {
        $set: {
          "iterator.$[module].value.data.text": translatable("Hello Preview"),
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

    const route = await db.collection("Route").findOne({
      contentType: Page.name,
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

      await upsertHomeRouteMap({ db, page, route, language });
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
          body: richText("Edit manager-react and Vite will update this UI."),
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
          body: richText("Edit manager-react and Vite will update this UI."),
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
