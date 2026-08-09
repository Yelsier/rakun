import express from "express";
import type { RequestHandler, Router } from "express";

import {
  ensureRakunInitialized,
  getRakunBootstrapOptions,
  handleMediaBinaryUpload,
  runWithRakunRequestTrace,
} from "@rakun-kit/core";
import {
  createLocalMediaHttpHandlers,
  getLocalMediaServiceConfig,
  type LocalMediaServiceConfig,
} from "./media";
import { rakunExpressCrud } from "./crud";

export type RakunExpressIntegration = (router: Router) => void;

export type RakunExpressOptions = {
  healthPath?: string | false;
  integrations?: RakunExpressIntegration[];
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

export const rakunExpress = (
  options: RakunExpressOptions = {},
): RequestHandler => {
  const {
    healthPath = "/health",
    integrations = [rakunExpressCrud()],
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

  if (useJsonMiddleware) {
    router.use(express.json());
  }

  if (localMediaConfig) {
    router.use(rakunExpressLocalService(localMediaConfig));
  }

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
  createRakunLlmsTxtHandler,
  type RakunExpressLlmsTxtOptions,
} from "./web";
export * from "./media";
