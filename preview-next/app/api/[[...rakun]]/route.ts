import { rakunNext } from "@rakun-kit/next";

import { createPreviewBootstrap } from "../../../server/bootstrap";

export const dynamic = "force-dynamic";

const bootstrap = createPreviewBootstrap();
const handler = rakunNext({ bootstrap });

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
