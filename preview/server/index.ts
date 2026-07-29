import express from "express";

import { defineOperation, rakunBootstrap } from "@rakun-kit/core";
import { rakunExpress } from "@rakun-kit/express";
import { createLocalMediaServiceConfig } from "@rakun-kit/express/media";
import { z } from "zod";

import { Footer, Header, Page, previewContentTypes } from "./content-types";
import { env } from "./env";
import { seedPreviewData } from "./seed";
import { esManagerLocalePack } from "@rakun-kit/manager-locales/es";

rakunBootstrap({
  literals: {},
  internalContentTypes: {
    Page,
  },
  contentTypes: previewContentTypes,
  managerLanguages: [esManagerLocalePack],
  routes: [
    {
      key: "pages",
      contentType: Page.name,
      field: "slug",
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
  apiOperations: {
    "demo.helloWorld": defineOperation<
      { text: string },
      { message: string },
      "query",
      "get",
      "public"
    >({
      access: "public",
      kind: "query",
      method: "get",
      description: "Return a hello world message with the provided text",
      input: z.object({
        text: z.string().default("world"),
      }),
      output: z.object({
        message: z.string(),
      }),
      resolve: ({ input }) => ({
        message: `Hello ${input.text}`,
      }),
    }),
  },
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
