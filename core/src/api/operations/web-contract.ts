import z from 'zod'

import type { RakunOperationContractMap } from './types'
import { defineOperationContract } from './types'
import { Language } from '../../internal-content-types'
import {
  pageInput,
  pageOutput,
  previewPageInput,
  previewPageOutput,
  sitemapInput,
  sitemapOutput,
  staticPathsOutput,
  robotsOutput,
  llmsInput,
  llmsOutput,
} from '../../contracts'

export const createWebOperationContracts = () =>
  ({
    'web.languages': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get all available languages',
      output: z.array(Language.getOutputSchema()),
    }),
    'web.page': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get page data for a given path',
      input: pageInput,
      output: pageOutput,
    }),
    'web.previewPage': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get temporary preview page data for a token',
      input: previewPageInput,
      output: previewPageOutput,
    }),
    'web.sitemap': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get public page paths for sitemap generation',
      input: sitemapInput,
      output: sitemapOutput,
    }),
    'web.staticPaths': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get public paths configured for static rendering',
      output: staticPathsOutput,
    }),
    'web.robots': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get robots.txt content',
      output: robotsOutput,
    }),
    'web.llms': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Get the curated llms.txt content',
      input: llmsInput,
      output: llmsOutput,
    }),
    'web.test': defineOperationContract({
      access: 'public',
      kind: 'query',
      method: 'get',
      description: 'Test route to verify that the router is working',
      output: z.object({ ok: z.boolean() }),
    }),
  }) satisfies RakunOperationContractMap
