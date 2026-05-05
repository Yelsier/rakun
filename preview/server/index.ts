import express from "express";

import { rakunBootstrap } from "@rakun/core";
import { rakunExpress } from "@rakun/express";
import { createLocalMediaServiceConfig } from "@rakun/express/media";

import { Footer, Header, Page, previewContentTypes } from "./content-types";
import { env } from "./env";
import { seedPreviewData } from "./seed";

rakunBootstrap({
  literals: {},
  internalContentTypes: {
    Page,
  },
  contentTypes: previewContentTypes,
  routes: [
    {
      key: "pages",
      contentType: Page.name,
      field: "slug",
      iterator: "modules",
      hasPage: true,
      dynamic: false,
      defaultBasePath: "",
      layout: [
        { key: "header", contentType: Header.name },
        { type: "content" },
        { key: "footer", contentType: Footer.name },
      ],
    },
  ],
  mongo: {
    MONGO_URI: env.mongoUri,
    ENVIRONMENT: "development",
  },
  media: createLocalMediaServiceConfig({
    rootDir: env.mediaDir,
    baseUrl: env.apiBasePath,
    publicBaseUrl: env.apiBasePath,
    tokenSecret: env.mediaTokenSecret,
    defaultAccess: "private",
  }),
  logger: {
    level: "debug",
    prettify: true,
  },
});

const app = express();

app.use(env.apiBasePath, (req, res, next) => {
  const originalCookie = res.cookie.bind(res);

  res.cookie = ((name, value, options) =>
    originalCookie(name, value, {
      ...(typeof options === "object" ? options : {}),
      secure: false,
      domain: undefined,
    })) as typeof res.cookie;

  next();
});

app.use(env.apiBasePath, rakunExpress());

app.listen(env.port, () => {
  console.log(`[preview] Rakun API listening on http://localhost:${env.port}${env.apiBasePath}`);
});

void seedPreviewData().catch((error) => {
  console.warn(
    "[preview] seed skipped or failed. Check MONGO_URI in preview/.env.",
  );
  console.warn(error);
});
