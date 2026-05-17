import type {
  TranslateBatchInput,
  TranslateBatchOutput,
  TranslationAdapter,
} from "./adapters";

export type TranslationServiceConfig = {
  adapter: TranslationAdapter;
};

export type TranslationService = {
  translateBatch(input: TranslateBatchInput): Promise<TranslateBatchOutput>;
};

export const createTranslationServiceFromAdapter = ({
  adapter,
}: TranslationServiceConfig): TranslationService => ({
  translateBatch: (input) => adapter.translateBatch(input),
});
