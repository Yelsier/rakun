import z from "zod";

import type { RakunOperationContractMap } from "./types";
import { defineOperationContract } from "./types";
import { Language } from "../../internal-content-types";
import {
  pageInput,
  pageOutput,
  sitemapInput,
  sitemapOutput,
} from "../../contracts";

export const createWebOperationContracts = () =>
  ({
    "web.languages": defineOperationContract({
      access: "public",
      kind: "query",
      method: "get",
      description: "Get all available languages",
      output: z.array(Language.getOutputSchema()),
    }),
    "web.page": defineOperationContract({
      access: "public",
      kind: "query",
      method: "get",
      description: "Get page data for a given path",
      input: pageInput,
      output: pageOutput,
    }),
    "web.sitemap": defineOperationContract({
      access: "public",
      kind: "query",
      method: "get",
      description: "Get public page paths for sitemap generation",
      input: sitemapInput,
      output: sitemapOutput,
    }),
    "web.test": defineOperationContract({
      access: "public",
      kind: "query",
      method: "get",
      description: "Test route to verify that the router is working",
      output: z.object({ ok: z.boolean() }),
    }),
  }) satisfies RakunOperationContractMap;
