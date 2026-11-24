import { createRakunSitemapIndexRouteHandler } from "@rakun-kit/next/web";

export const dynamic = "force-dynamic";

export const GET = createRakunSitemapIndexRouteHandler({
  apiBaseUrl: "/api",
});
