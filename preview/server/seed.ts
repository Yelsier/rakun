import bcrypt from "bcrypt";
import { MongoClient, type Db, type Document } from "mongodb";

import { ensureRakunInitialized } from "@rakun-kit/core";
import { PermissionsList } from "@rakun-kit/core";

import {
  Article,
  Author,
  Footer,
  Header,
  Page,
  PageSection,
} from "./content-types";
import { env } from "./env";

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

export const seedPreviewData = async () => {
  if (!env.seedPreview) {
    return;
  }

  const client = await MongoClient.connect(env.mongoUri);
  const db = client.db(env.mongoUri.split("/").pop()?.split("?")[0]);
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

    await ensureRakunInitialized();

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
      { email: env.adminEmail },
      {
        $setOnInsert: {
          user: env.adminName,
          email: env.adminEmail,
          password: bcrypt.hashSync(env.adminPassword, 10),
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
        $setOnInsert: {
          brand: "Rakun Preview",
          primaryLinkLabel: "Backend",
          primaryLinkHref: "/backend",
          _type: Header.name,
          createdAt: now(),
          updatedAt: now(),
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
        $setOnInsert: {
          brand: "Rakun Preview",
          copyright: "2026 Rakun Preview",
          primaryLinkLabel: "Docs",
          primaryLinkHref: "/backend/settings/routes",
          _type: Footer.name,
          createdAt: now(),
          updatedAt: now(),
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
          modules: [
            {
              name: PageSection.name,
              value: {
                type: "existing",
                contentType: PageSection.name,
                _id: pageSection._id.toString(),
              },
            },
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

    await db.collection(Article.name).updateOne(
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
      { upsert: true },
    );

    console.log(
      `[preview] seeded admin ${env.adminEmail} / ${env.adminPassword}`,
    );
  } finally {
    if (lockAcquired) {
      await releaseSeedLock(db);
    }
    await client.close();
  }
};
