import { createRakunLocaleSitemapRouteHandler } from "@rakun-kit/next/web";

export const dynamic = "force-dynamic";

export const GET = createRakunLocaleSitemapRouteHandler({
  apiBaseUrl: "/api",
});
