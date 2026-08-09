import { createRakunLlmsTxtRouteHandler } from "@rakun-kit/next/web";

export const dynamic = "force-dynamic";

export const GET = createRakunLlmsTxtRouteHandler({
  apiBaseUrl: "/api",
});
