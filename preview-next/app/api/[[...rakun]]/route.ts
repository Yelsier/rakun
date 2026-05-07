import { Page } from "@rakun-kit/next/internal-content-types";
import { Fields, ContentType } from "@rakun-kit/next";

import { createLocalMediaServiceConfig, rakunNext } from "@rakun-kit/next";

export const dynamic = "force-dynamic";

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("MONGO_URI is required. Add it to preview-next/.env.local.");
}

const Header = new ContentType({
  name: "Header",
  fields: {
    uid: Fields.string().required(),
    logo: Fields.file().type("Image").required(),
    text: Fields.string().translatable(),
  },
  menu: {
    title: "Header",
  },
  listFields: ["uid"],
  uniques: [["uid"]],
});

export const { GET, POST, PUT } = rakunNext({
  bootstrap: {
    literals: {},
    contentTypes: [Header],
    routes: [
      {
        key: "page",
        contentType: Page.name,
        field: "slug",
        iterator: "iterator",
        hasPage: true,
        dynamic: false,
        defaultBasePath: "",
        infoSchema: Page.getPopulatedSchema(),
        layout: [
          { type: "module", key: "header", contentType: Header.name },
          { type: "content" },
        ],
      },
    ],
    mongo: {
      MONGO_URI: mongoUri,
    },
    media: createLocalMediaServiceConfig({
      rootDir: ".",
      tokenSecret: "super-secret-token",
      baseUrl: "http://localhost:3000/api",
    }),
    logger: {
      level: "debug",
      prettify: true,
      verbose: true,
    },
  },
});
