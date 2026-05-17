export type TranslationLanguage = {
  code: string;
  name?: string;
};

export type TranslationSegment = {
  id: string;
  text: string;
};

export type TranslateBatchInput = {
  from: TranslationLanguage;
  to: TranslationLanguage[];
  segments: TranslationSegment[];
};

export type TranslateBatchOutput = {
  translations: Record<string, Record<string, string>>;
};

export interface TranslationAdapter {
  translateBatch(input: TranslateBatchInput): Promise<TranslateBatchOutput>;
}
