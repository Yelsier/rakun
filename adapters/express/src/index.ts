import express from "express";
import type { RequestHandler, Router } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import {
  ensureRakunInitialized,
  getRakunBootstrapOptions,
  handleMediaBinaryUpload,
  handlePublicMediaRequest,
  runWithRakunRequestTrace,
} from "@rakun-kit/core";
import {
  createLocalMediaHttpHandlers,
  getLocalMediaServiceConfig,
  type LocalMediaServiceConfig,
} from "./media";
import { rakunExpressCrud } from "./crud";
import {
  rakunExpressRealtime,
  type RakunExpressRealtimeOptions,
} from "./realtime";

export type RakunExpressIntegration = (router: Router) => void;

export type RakunExpressOptions = {
  healthPath?: string | false;
  integrations?: RakunExpressIntegration[];
  realtime?: false | RakunExpressRealtimeOptions;
  useJsonMiddleware?: boolean;
};

export const rakunExpressLocalService = (
  media: LocalMediaServiceConfig,
): Router => {
  const router = express.Router();
  const localMedia = createLocalMediaHttpHandlers(media);

  router.put("/media/local/upload/:token", async (req, res, next) => {
    try {
      await localMedia.handleUpload(req, res, req.params.token);
    } catch (error) {
      next(error);
    }
  });

  router.get("/media/local/private/:token", async (req, res, next) => {
    try {
      await localMedia.handlePrivateGet(res, req.params.token);
    } catch (error) {
      next(error);
    }
  });

  router.use("/media/public", express.static(localMedia.getPublicRootDir()));

  return router;
};

const writeFetchResponse = async (
  response: Response,
  res: Parameters<RequestHandler>[1],
): Promise<void> => {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  await pipeline(
    Readable.fromWeb(response.body as import("node:stream/web").ReadableStream),
    res,
  );
};

export const rakunExpress = (
  options: RakunExpressOptions = {},
): RequestHandler => {
  const {
    healthPath = "/health",
    integrations = [rakunExpressCrud()],
    realtime = {},
    useJsonMiddleware = true,
  } = options;

  const router = express.Router();
  const localMediaConfig = getLocalMediaServiceConfig(
    getRakunBootstrapOptions()?.media,
  );

  router.use(async (_req, _res, next) => {
    try {
      await ensureRakunInitialized();
      next();
    } catch (error) {
      next(error);
    }
  });

  router.use((req, _res, next) =>
    runWithRakunRequestTrace(req.method, req.originalUrl || req.url, next),
  );

  if (healthPath) {
    router.get(healthPath, (_req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ ok: true });
    });
  }

  if (realtime) {
    rakunExpressRealtime(realtime)(router);
  }

  if (useJsonMiddleware) {
    router.use(express.json());
  }

  if (localMediaConfig) {
    router.use(rakunExpressLocalService(localMediaConfig));
  }

  router.use("/media", async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    try {
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            headers.append(name, item);
          }
        } else if (value) {
          headers.set(name, value);
        }
      }
      const response = await handlePublicMediaRequest({
        request: new Request(`http://rakun.local${req.originalUrl || req.url}`, {
          headers,
          method: req.method,
        }),
        pathSegments: req.path.split("/").filter(Boolean),
      });
      if (!response) {
        next();
        return;
      }
      await writeFetchResponse(response, res);
    } catch (error) {
      next(error);
    }
  });

  if (getRakunBootstrapOptions()?.media) {
    router.post("/media/upload", async (req, res, next) => {
      try {
        await handleMediaBinaryUpload(req, res);
      } catch (error) {
        next(error);
      }
    });
  }

  for (const integration of integrations) {
    integration(router);
  }

  return router;
};

export { rakunExpressCrud } from "./crud";
export {
  rakunExpressRealtime,
  type RakunExpressRealtimeOptions,
} from "./realtime";
export {
  createRakunLlmsTxtHandler,
  type RakunExpressLlmsTxtOptions,
} from "./web";
export * from "./media";
export * from './platform'
