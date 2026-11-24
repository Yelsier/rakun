import type { Request, RequestHandler } from "express";

import {
  ensureRakunInitialized,
  getRakunWebLlmsTxt,
} from "@rakun-kit/core";

export type RakunExpressLlmsTxtOptions = {
  language?: string;
  resolveLanguage?: (request: Request) => string | undefined;
};

export const createRakunLlmsTxtHandler = (
  options: RakunExpressLlmsTxtOptions = {},
): RequestHandler =>
  async (request, response, next) => {
    try {
      await ensureRakunInitialized();
      const result = await getRakunWebLlmsTxt({
        language: options.resolveLanguage?.(request) ?? options.language,
      });

      if (!result) {
        response.status(404).end();
        return;
      }

      response.setHeader("Content-Type", "text/plain; charset=utf-8");
      response.status(200).send(result.content);
    } catch (error) {
      next(error);
    }
  };
