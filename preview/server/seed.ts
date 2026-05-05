import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

import { ensureRakunInitialized } from "@rakun-kit/core";
import { PermissionsList } from "@rakun-kit/core/lib/Permissions";

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

export const seedPreviewData = async () => {
  if (!env.seedPreview) {
    return;
  }

  const client = await MongoClient.connect(env.mongoUri);
  const db = client.db(env.mongoUri.split("/").pop()?.split("?")[0]);

  try {
    await db.collection("Language").updateOne(
      { code: "en" },
      {
        $setOnInsert: {
          code: "en",
          name: "English",
          default: true,
          _type: "Language",
          createdAt: now(),
          updatedAt: now(),
        },
      },
      { upsert: true },
    );

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

      await db.collection("RouteMap").updateOne(
        {
          contentType: Page.name,
          contentTypeId: page._id.toString(),
          routeId: route._id.toString(),
          languageId: language._id.toString(),
        },
        {
          $set: {
            path: "/en/",
            contentType: Page.name,
            contentTypeId: page._id.toString(),
            routeId: route._id.toString(),
            languageId: language._id.toString(),
            _type: "RouteMap",
            updatedAt: now(),
          },
          $setOnInsert: {
            createdAt: now(),
          },
        },
        { upsert: true },
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
          body: "<p>Edit manager-react and Vite will update this UI.</p>",
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
    await client.close();
  }
};
