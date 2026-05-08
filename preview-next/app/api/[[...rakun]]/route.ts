import { Page } from "@rakun-kit/next/internal-content-types";
import {
  createLocalMediaServiceConfig,
  ensureRakunBootstrap,
  ensureRakunInitialized,
  rakunNext,
  type RakunBootstrapOptions,
  type RakunNextRouteContext,
} from "@rakun-kit/next";
import {
  Footer,
  Header,
  previewContentTypes,
} from "../../../server/content-types";
import { seedPreviewData } from "../../../server/seed";

export const dynamic = "force-dynamic";

const mongoUri =
  process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/rakun_preview";

const bootstrap = {
  literals: {},
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
} satisfies RakunBootstrapOptions;

let seedPromise: Promise<void> | null = null;

const ensurePreviewSeeded = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is required. Add it to preview-next/.env.local.",
    );
  }

  ensureRakunBootstrap(bootstrap);
  await ensureRakunInitialized();

  seedPromise ??= seedPreviewData({
    mongoUri,
    adminEmail: process.env.PREVIEW_ADMIN_EMAIL,
    adminName: process.env.PREVIEW_ADMIN_NAME,
    adminPassword: process.env.PREVIEW_ADMIN_PASSWORD,
    enabled: process.env.SEED_PREVIEW !== "false",
  }).catch((error) => {
    seedPromise = null;
    throw error;
  });

  await seedPromise;
};

const handler = rakunNext({ bootstrap });

const withSeed =
  (
    run: (
      request: Request,
      context: RakunNextRouteContext,
    ) => Promise<Response>,
  ) =>
  async (request: Request, context: RakunNextRouteContext) => {
    await ensurePreviewSeeded();
    return run(request, context);
  };

export const GET = withSeed(handler.GET);
export const POST = withSeed(handler.POST);
export const PUT = withSeed(handler.PUT);
