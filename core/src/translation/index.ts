import type { TranslationAdapter } from "./adapters";
import {
  createTranslationServiceFromAdapter,
  type TranslationService,
  type TranslationServiceConfig,
} from "./translationService";

let _translationService: TranslationService | null = null;
let _config: TranslationServiceConfig | null = null;

export const createTranslationConnection = (
  config: TranslationServiceConfig,
) => {
  _config = config;
};

export function createTranslationService(
  config: TranslationServiceConfig,
): TranslationService {
  _config = config;
  _translationService = createTranslationServiceFromAdapter(config);
  return _translationService;
}

export function getTranslationService(): TranslationService {
  if (!_translationService) {
    if (!_config) {
      throw new Error(
        "Translation service not initialized. Call createTranslationConnection first.",
      );
    }

    return createTranslationService(_config);
  }

  return _translationService;
}

export function hasTranslationService(): boolean {
  return Boolean(_translationService || _config);
}

export type { TranslationAdapter, TranslationService, TranslationServiceConfig };
export * from "./adapters";
export * from "./document";
