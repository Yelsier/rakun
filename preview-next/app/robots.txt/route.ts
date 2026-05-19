import { createRakunRobotsTxtRouteHandler } from "@rakun-kit/next/web";

export const dynamic = "force-dynamic";

export const GET = createRakunRobotsTxtRouteHandler({
  apiBaseUrl: "/api",
});
