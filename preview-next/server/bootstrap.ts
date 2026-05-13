import { Page } from "@rakun-kit/next/internal-content-types";
import {
  createLocalMediaServiceConfig,
  type RakunBootstrapOptions,
} from "@rakun-kit/next";

import {
  Footer,
  Header,
  previewContentTypes,
} from "./content-types";
import { apiOperations } from "./api-operations";

export const getPreviewMongoUri = () =>
  process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/rakun_preview";

export const createPreviewBootstrap = () =>
  ({
    literals: {
      "test.hello": {
        defaultMessage: "Hello, {name}!",
        description: "A greeting message",
        usedBy: ["HelloWorld"],
        params: {
          name: "string",
        },
      },
      "test.goodbye": {
        defaultMessage: "Goodbye, {name}!",
        description: "A farewell message",
        usedBy: ["HelloWorld"],
        params: {
          name: "string",
        },
      },
    },
    contentTypes: previewContentTypes,
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
          { type: "module", key: "footer", contentType: Footer.name },
        ],
      },
    ],
    mongo: {
      MONGO_URI: getPreviewMongoUri(),
    },
    media: createLocalMediaServiceConfig({
      rootDir: ".",
      tokenSecret: "super-secret-token",
      baseUrl: "http://localhost:3000/api",
    }),
    apiOperations,
    logger: {
      level: "debug",
      prettify: true,
      verbose: true,
    },
  }) satisfies RakunBootstrapOptions;
