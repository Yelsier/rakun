import {
  ensureRakunInitialized,
  getRakunBootstrapOptions,
  handleMediaBinaryUpload,
  type RakunBootstrapOptions,
  type MediaBinaryUploadRequest,
  type MediaBinaryUploadResponse,
  runWithRakunRequestTrace,
} from "@rakun-kit/core";
import { Readable } from "stream";

import { rakunNextCrud } from "./crud";
import { rakunNextRealtime } from './realtime'
import { applyRakunBootstrap } from "./bootstrap";
import {
  getLocalMediaServiceConfig,
  rakunNextLocalService,
} from "./media";
import type {
  RakunNextHandler,
  RakunNextIntegration,
  RakunNextRouteContext,
} from "./shared";
import {
  createResponseHeaderAdapter,
  getRouteSegments,
  headersToObject,
  normalizePathSegments,
} from "./shared";

export * from "@rakun-kit/core";
export * from "./translation";

export type RakunNextOptions = {
  bootstrap?: RakunBootstrapOptions | (() => RakunBootstrapOptions);
  healthPath?: string | false;
  integrations?: RakunNextIntegration[];
  realtimePath?: string | false;
};

const jsonResponse = (status: number, body: unknown) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};

const createNodeReadableFromRequest = async (
  request: Request,
): Promise<MediaBinaryUploadRequest> => {
  const body = Buffer.from(await request.arrayBuffer());
  const stream = Readable.from(body.length > 0 ? [body] : []);

  return Object.assign(stream, {
    headers: headersToObject(request.headers),
  }) as MediaBinaryUploadRequest;
};

const handleNextMediaBinaryUpload = async (request: Request) => {
  const responseHeaders = new Headers();
  let statusCode = 200;
  let body: string | Uint8Array | undefined;
  const headerAdapter = createResponseHeaderAdapter(responseHeaders);

  const responseAdapter = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number | undefined) {
      statusCode = value ?? 200;
    },
    setHeader: headerAdapter.setHeader,
    cookie: headerAdapter.cookie,
    end: (chunk?: string | Uint8Array) => {
      body = chunk;
    },
  } as MediaBinaryUploadResponse;

  await handleMediaBinaryUpload(
    await createNodeReadableFromRequest(request),
    responseAdapter,
  );

  const responseBody =
    typeof body === "string" ? body : body ? Buffer.from(body) : undefined;

  return new Response(responseBody, {
    status: statusCode,
    headers: responseHeaders,
  });
};

const createHandler = (options: RakunNextOptions = {}): RakunNextHandler => {
  const {
    bootstrap,
    healthPath = "health",
    integrations = [rakunNextCrud()],
    realtimePath = 'realtime/events',
  } = options;
  const healthSegments = healthPath === false ? null : normalizePathSegments(healthPath);

  return async (request: Request, context: RakunNextRouteContext) => {
    if (bootstrap) {
      applyRakunBootstrap(bootstrap);
    }

    await ensureRakunInitialized();
    const bootstrapOptions = getRakunBootstrapOptions();
    const localMediaConfig = getLocalMediaServiceConfig(bootstrapOptions?.media);
    const localMediaIntegration = localMediaConfig
      ? rakunNextLocalService(localMediaConfig)
      : null;
    const realtimeIntegration = realtimePath
      ? rakunNextRealtime({ path: realtimePath })
      : null

    return await runWithRakunRequestTrace(
      request.method,
      new URL(request.url).pathname,
      async () => {
        const segments = await getRouteSegments(context);

        if (
          request.method === "GET" &&
          healthSegments &&
          segments.join("/") === healthSegments.join("/")
        ) {
          const headers = new Headers();
          headers.set("Cache-Control", "no-store");
          headers.set("Content-Type", "application/json; charset=utf-8");

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers,
          });
        }

        const realtimeResponse = await realtimeIntegration?.({
          request,
          context,
          segments,
        })
        if (realtimeResponse) return realtimeResponse

        const localMediaResponse = await localMediaIntegration?.({
          request,
          context,
          segments,
        });

        if (localMediaResponse) {
          return localMediaResponse;
        }

        if (
          bootstrapOptions?.media &&
          request.method === "POST" &&
          segments.join("/") === "media/upload"
        ) {
          return handleNextMediaBinaryUpload(request);
        }

        for (const integration of integrations) {
          const response = await integration({
            request,
            context,
            segments,
          });

          if (response) {
            return response;
          }
        }

        return jsonResponse(404, {
          message: "Route not found",
        });
      },
    );
  };
};

export const rakunNext = (options: RakunNextOptions = {}) => {
  const handler = createHandler(options);

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
  };
};

export { rakunNextCrud } from "./crud";
export {
  createRakunSseResponse,
  rakunNextRealtime,
  subscribeRakunWebSocket,
  type RakunNextRealtimeOptions,
  type RakunRealtimeWebSocket,
} from './realtime'
export { rakunNextLocalService } from "./media";
export * from "./media";
export * from "./shared";
export * from './platform'
