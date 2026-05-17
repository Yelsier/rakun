import OpenAI from 'openai'

import type {
  TranslateBatchInput,
  TranslateBatchOutput,
  TranslationAdapter,
  TranslationServiceConfig,
} from '@rakun-kit/core'
import { throwAppError } from '@rakun-kit/core/errors'

export type OpenAITranslationServiceConfig = {
  apiKey?: string
  model?: string
  baseURL?: string
  organization?: string
  project?: string
}

type OpenAIResponsesClient = {
  responses: {
    create: (input: unknown) => Promise<{ output_text?: string }>
  }
}

type RawTranslationOutput = {
  translations?: Array<{
    language?: unknown
    segmentId?: unknown
    text?: unknown
  }>
}

const DEFAULT_MODEL = 'gpt-5.4-mini'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const translationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          language: { type: 'string' },
          segmentId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['language', 'segmentId', 'text'],
      },
    },
  },
  required: ['translations'],
}

export class OpenAITranslationAdapter implements TranslationAdapter {
  private readonly client: OpenAIResponsesClient
  private readonly model: string

  constructor(config: OpenAITranslationServiceConfig = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      organization: config.organization,
      project: config.project,
    }) as unknown as OpenAIResponsesClient
    this.model = config.model ?? DEFAULT_MODEL
  }

  async translateBatch(input: TranslateBatchInput): Promise<TranslateBatchOutput> {
    if (input.segments.length === 0 || input.to.length === 0) {
      return { translations: {} }
    }

    const targetCodes = new Set(input.to.map((language) => language.code))
    const segments = input.segments.map(({ id, text }) => ({ id, text }))
    const segmentIds = new Set(segments.map((segment) => segment.id))
    let response: { output_text?: string }

    try {
      response = await this.client.responses.create({
        model: this.model,
        instructions: [
          'Translate CMS content accurately.',
          'Return only the requested JSON schema.',
          'Preserve placeholders, variables, numbers, punctuation, and inline markup.',
          'Do not translate segment IDs or language codes.',
        ].join(' '),
        input: JSON.stringify({
          from: input.from,
          to: input.to,
          segments,
        }),
        text: {
          format: {
            type: 'json_schema',
            name: 'rakun_translation_batch',
            strict: true,
            schema: translationSchema,
          },
        },
      })
    } catch (error) {
      throwAppError('INTERNAL', {
        message: `OpenAI translation request failed: ${getErrorMessage(error)}`,
      })
    }

    const parsed = this.parseOutput(response.output_text)
    const translations: TranslateBatchOutput['translations'] = {}

    for (const item of parsed.translations ?? []) {
      if (
        typeof item.language !== 'string' ||
        typeof item.segmentId !== 'string' ||
        typeof item.text !== 'string' ||
        !targetCodes.has(item.language) ||
        !segmentIds.has(item.segmentId)
      ) {
        continue
      }

      translations[item.language] ??= {}
      translations[item.language][item.segmentId] = item.text
    }

    return { translations }
  }

  private parseOutput(outputText: string | undefined): RawTranslationOutput {
    if (!outputText) {
      throwAppError('INTERNAL', {
        message: 'OpenAI translation response did not include output text.',
      })
    }

    let parsed: RawTranslationOutput

    try {
      parsed = JSON.parse(outputText) as RawTranslationOutput
    } catch (error) {
      throwAppError('INTERNAL', {
        message: `OpenAI translation response is not valid JSON: ${getErrorMessage(error)}`,
      })
    }

    if (!Array.isArray(parsed.translations)) {
      throwAppError('INTERNAL', {
        message: 'OpenAI translation response has invalid shape.',
      })
    }

    return parsed
  }
}

export const createOpenAITranslationServiceConfig = (
  config: OpenAITranslationServiceConfig = {}
): TranslationServiceConfig => ({
  adapter: new OpenAITranslationAdapter(config),
})
