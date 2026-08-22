import type ContentType from "../lib/ContentType";
import type { AnyField } from "../lib/fields/Field";
import type { LanguageSchema } from "../internal-content-types/Language";
import type { TranslationSegment } from "./adapters";
import type { TranslationService } from "./translationService";
import { isRecord } from "../lib/utils/isRecord";

type PathSegment = string | number;

type PendingTranslation = {
  targetLanguage: string;
  segmentIds: string[];
  topLevelField: string;
  apply: (translations: Record<string, string>) => void;
};

type MutableRecord = Record<string, unknown>;

const supportedStringUis = new Set(["Text", "Textarea", "RichText", "Slug"]);

const isTranslatableRecord = (value: unknown): value is MutableRecord =>
  isRecord(value) && value._tag === "Translatable";

const isSupportedStringField = (field: AnyField) =>
  field.meta.type === "String" && supportedStringUis.has(field.meta.ui);

const cloneValue = <T>(value: T): T => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as MutableRecord).map(([key, item]) => [
        key,
        cloneValue(item),
      ]),
    ) as T;
  }
  return value;
};

const getAt = (root: unknown, path: PathSegment[]) =>
  path.reduce<unknown>((cursor, segment) => {
    if (cursor === null || cursor === undefined) return undefined;
    return (cursor as Record<string | number, unknown>)[segment];
  }, root);

const setAt = (root: unknown, path: PathSegment[], value: unknown) => {
  if (path.length === 0) return;

  let cursor = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    const nextSegment = path[i + 1];
    const next = cursor[segment];

    if (!next || typeof next !== "object") {
      cursor[segment] = typeof nextSegment === "number" ? [] : {};
    }

    cursor = cursor[segment] as Record<string | number, unknown>;
  }

  cursor[path[path.length - 1]] = value;
};

const getTopLevelField = (path: PathSegment[]) => String(path[0] ?? "");

const hasTextNodeContent = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasTextNodeContent);
  if (!isRecord(value)) return false;

  if (typeof value.text === "string" && value.text.trim().length > 0) {
    return true;
  }

  return Object.values(value).some(hasTextNodeContent);
};

const countTextNodes = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countTextNodes(item), 0);
  }
  if (!isRecord(value)) return 0;

  const ownText =
    typeof value.text === "string" && value.text.trim().length > 0 ? 1 : 0;

  return (
    ownText +
    Object.entries(value)
      .filter(([key]) => key !== "text")
      .reduce((count, [, item]) => count + countTextNodes(item), 0)
  );
};

const hasSupportedValueContent = (ui: string, value: unknown): boolean => {
  if (ui === "RichText") return hasTextNodeContent(value);
  return typeof value === "string" && value.trim().length > 0;
};

const countSupportedValueSegments = (ui: string, value: unknown): number => {
  if (ui === "RichText") return countTextNodes(value);
  return typeof value === "string" && value.trim().length > 0 ? 1 : 0;
};

const hasAnyContent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasAnyContent);
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => key !== "_tag")
      .some(([, item]) => hasAnyContent(item));
  }
  return true;
};

const hasEntries = (
  field: AnyField,
): field is AnyField & { fields: Array<{ name: string; field: AnyField }> } =>
  "fields" in field && Array.isArray((field as { fields?: unknown }).fields);

const hasNestedField = (
  field: AnyField,
): field is AnyField & { field: AnyField } =>
  "field" in field && !!(field as { field?: unknown }).field;

const hasRelationContentType = (
  field: AnyField,
): field is AnyField & { contentType: ContentType } =>
  "contentType" in field &&
  isRecord((field as { contentType?: unknown }).contentType) &&
  "fields" in ((field as { contentType: unknown }).contentType as MutableRecord);

const hasContentTypeFields = (
  value: unknown,
): value is ContentType =>
  isRecord(value) && "fields" in value && isRecord(value.fields);

const createRichTextPlan = (
  value: unknown,
  addSegment: (text: string) => string,
) => {
  const nextValue = cloneValue(value);
  const segmentIds: string[] = [];

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!isRecord(node)) return;

    if (typeof node.text === "string" && node.text.trim().length > 0) {
      const segmentId = addSegment(node.text);
      segmentIds.push(segmentId);
      node.text = { segmentId };
    }

    Object.entries(node)
      .filter(([key]) => key !== "text")
      .forEach(([, item]) => visit(item));
  };

  visit(nextValue);

  if (segmentIds.length === 0) return null;

  return {
    segmentIds,
    build: (translations: Record<string, string>) => {
      const translated = cloneValue(nextValue);
      const replace = (node: unknown) => {
        if (Array.isArray(node)) {
          node.forEach(replace);
          return;
        }

        if (!isRecord(node)) return;

        if (isRecord(node.text) && typeof node.text.segmentId === "string") {
          node.text = translations[node.text.segmentId] ?? "";
        }

        Object.entries(node)
          .filter(([key]) => key !== "text")
          .forEach(([, item]) => replace(item));
      };

      replace(translated);
      return translated;
    },
  };
};

export type DocumentTranslationPatchInput = {
  contentType: ContentType;
  document: Record<string, unknown>;
  from: LanguageSchema;
  to: LanguageSchema[];
  overwrite: boolean;
  service: Pick<TranslationService, "translateBatch">;
};

export type DocumentTranslationPatchOutput = {
  patch: Record<string, unknown>;
  summary: {
    requestedLanguages: string[];
    translatedLanguages: string[];
    translatedSegments: number;
    skippedSegments: number;
    translatedFields: string[];
  };
};

export const createDocumentTranslationPatch = async ({
  contentType,
  document,
  from,
  to,
  overwrite,
  service,
}: DocumentTranslationPatchInput): Promise<DocumentTranslationPatchOutput> => {
  const targetLanguages = to.filter((language) => language.code !== from.code);
  const working = cloneValue(document);
  const segments: TranslationSegment[] = [];
  const pending: PendingTranslation[] = [];
  const changedTopLevelFields = new Set<string>();
  const translatedLanguages = new Set<string>();
  let skippedSegments = 0;
  let translatedSegments = 0;

  const addSegment = (_path: PathSegment[], text: string) => {
    const id = String(segments.length);
    segments.push({
      id,
      text,
    });
    return id;
  };

  const addValueTranslation = ({
    ui,
    sourceValue,
    targetValue,
    targetPath,
    targetLanguage,
  }: {
    ui: string;
    sourceValue: unknown;
    targetValue: unknown;
    targetPath: PathSegment[];
    targetLanguage: string;
  }) => {
    const sourceSegmentCount = countSupportedValueSegments(ui, sourceValue);

    if (sourceSegmentCount === 0) {
      skippedSegments += 1;
      return;
    }

    if (!overwrite && hasSupportedValueContent(ui, targetValue)) {
      skippedSegments += sourceSegmentCount;
      return;
    }

    if (ui === "RichText") {
      const plan = createRichTextPlan(sourceValue, (text) =>
        addSegment(targetPath, text),
      );
      if (!plan) {
        skippedSegments += 1;
        return;
      }

      pending.push({
        targetLanguage,
        segmentIds: plan.segmentIds,
        topLevelField: getTopLevelField(targetPath),
        apply: (translations) => {
          setAt(working, targetPath, plan.build(translations));
        },
      });
      return;
    }

    if (typeof sourceValue !== "string") {
      skippedSegments += 1;
      return;
    }

    const segmentId = addSegment(targetPath, sourceValue);
    pending.push({
      targetLanguage,
      segmentIds: [segmentId],
      topLevelField: getTopLevelField(targetPath),
      apply: (translations) => {
        setAt(working, targetPath, translations[segmentId] ?? "");
      },
    });
  };

  const ensureTranslatableAt = (path: PathSegment[], sourceValue: unknown) => {
    const current = getAt(working, path);
    if (isTranslatableRecord(current)) return current;

    const next: MutableRecord = {
      _tag: "Translatable",
    };

    if (sourceValue !== undefined && sourceValue !== null) {
      next[from.code] = sourceValue;
    }

    setAt(working, path, next);
    return next;
  };

  const visitContentType = (
    nestedContentType: ContentType,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (!isRecord(sourceValue)) return;

    const targetRecord = isRecord(targetValue) ? targetValue : sourceValue;

    Object.entries(nestedContentType.fields).forEach(([fieldName, field]) => {
      visitField(
        field,
        sourceValue[fieldName],
        targetRecord[fieldName],
        [...targetPath, fieldName],
        insideTranslatableContainer,
        targetLanguage,
      );
    });
  };

  const visitList = (
    field: AnyField,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (!hasEntries(field) || !Array.isArray(sourceValue)) return;
    const targetItems = Array.isArray(targetValue) ? targetValue : sourceValue;

    sourceValue.forEach((item, index) => {
      if (!isRecord(item) || typeof item.name !== "string") return;

      const entry = field.fields.find((candidate) => candidate.name === item.name);
      if (!entry) return;

      if (!isRecord(targetItems[index])) {
        targetItems[index] = cloneValue(item);
      }

      const targetItem = targetItems[index] as MutableRecord;
      visitField(
        entry.field,
        item.value,
        targetItem.value,
        [...targetPath, index, "value"],
        insideTranslatableContainer,
        targetLanguage,
      );
    });
  };

  const visitSimpleList = (
    field: AnyField,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (!hasNestedField(field) || !Array.isArray(sourceValue)) return;
    const targetItems = Array.isArray(targetValue) ? targetValue : sourceValue;

    sourceValue.forEach((item, index) => {
      if (targetItems[index] === undefined) {
        targetItems[index] = cloneValue(item);
      }

      visitField(
        field.field,
        item,
        targetItems[index],
        [...targetPath, index],
        insideTranslatableContainer,
        targetLanguage,
      );
    });
  };

  const visitRelation = (
    field: AnyField,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (!hasRelationContentType(field)) return;
    if (!isRecord(sourceValue) || sourceValue.type !== "new") return;

    if (isRecord(targetValue) && targetValue.type === "existing") return;

    if (!isRecord(targetValue) || targetValue.type !== "new") {
      setAt(working, targetPath, cloneValue(sourceValue));
      targetValue = getAt(working, targetPath);
    }

    if (!isRecord(targetValue) || !isRecord(sourceValue.data)) return;

    const targetData = isRecord(targetValue.data)
      ? targetValue.data
      : cloneValue(sourceValue.data);
    targetValue.data = targetData;

    if (hasContentTypeFields(field.contentType)) {
      visitContentType(
        field.contentType,
        sourceValue.data,
        targetData,
        [...targetPath, "data"],
        insideTranslatableContainer,
        targetLanguage,
      );
    }
  };

  const visitContainer = (
    field: AnyField,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (field.meta.type === "List" && field.meta.ui !== "SimpleList") {
      visitList(
        field,
        sourceValue,
        targetValue,
        targetPath,
        insideTranslatableContainer,
        targetLanguage,
      );
      return;
    }

    if (field.meta.ui === "SimpleList") {
      visitSimpleList(
        field,
        sourceValue,
        targetValue,
        targetPath,
        insideTranslatableContainer,
        targetLanguage,
      );
      return;
    }

    if (field.meta.type === "Relation") {
      visitRelation(
        field,
        sourceValue,
        targetValue,
        targetPath,
        insideTranslatableContainer,
        targetLanguage,
      );
    }
  };

  const visitTranslatableContainer = (field: AnyField, path: PathSegment[]) => {
    const current = getAt(working, path);
    const sourceValue = isTranslatableRecord(current) ? current[from.code] : current;

    if (!hasAnyContent(sourceValue)) {
      skippedSegments += targetLanguages.length;
      return;
    }

    const record = isTranslatableRecord(current)
      ? current
      : ensureTranslatableAt(path, sourceValue);

    targetLanguages.forEach((language) => {
      const existingTarget = record[language.code];
      const targetValue =
        overwrite || !hasAnyContent(existingTarget)
          ? cloneValue(sourceValue)
          : existingTarget;

      record[language.code] = targetValue;
      visitContainer(
        field,
        sourceValue,
        targetValue,
        [...path, language.code],
        true,
        language.code,
      );
    });
  };

  const visitTranslatableString = (field: AnyField, path: PathSegment[]) => {
    const current = getAt(working, path);
    const ui = field.meta.ui;
    const sourceValue = isTranslatableRecord(current)
      ? current[from.code]
      : current;

    if (countSupportedValueSegments(ui, sourceValue) === 0) {
      skippedSegments += targetLanguages.length;
      return;
    }

    const record = isTranslatableRecord(current)
      ? current
      : ensureTranslatableAt(path, sourceValue);

    targetLanguages.forEach((language) => {
      addValueTranslation({
        ui,
        sourceValue: record[from.code],
        targetValue: record[language.code],
        targetPath: [...path, language.code],
        targetLanguage: language.code,
      });
    });
  };

  const visitField = (
    field: AnyField,
    sourceValue: unknown,
    targetValue: unknown,
    targetPath: PathSegment[],
    insideTranslatableContainer: boolean,
    targetLanguage?: string,
  ) => {
    if (isSupportedStringField(field)) {
      if (field.getIsTranslatable() && !insideTranslatableContainer) {
        visitTranslatableString(field, targetPath);
        return;
      }

      if (insideTranslatableContainer && targetLanguage) {
        addValueTranslation({
          ui: field.meta.ui,
          sourceValue,
          targetValue,
          targetPath,
          targetLanguage,
        });
      }
      return;
    }

    if (field.getIsTranslatable() && !insideTranslatableContainer) {
      visitTranslatableContainer(field, targetPath);
      return;
    }

    visitContainer(
      field,
      sourceValue,
      targetValue,
      targetPath,
      insideTranslatableContainer,
      targetLanguage,
    );
  };

  Object.entries(contentType.fields).forEach(([fieldName, field]) => {
    if (field.getVisibility() === "api") return;
    visitField(
      field,
      working[fieldName],
      working[fieldName],
      [fieldName],
      false,
    );
  });

  if (segments.length > 0) {
    const result = await service.translateBatch({
      from: {
        code: from.code,
        name: from.name,
      },
      to: targetLanguages.map((language) => ({
        code: language.code,
        name: language.name,
      })),
      segments,
    });

    pending.forEach((translation) => {
      const languageTranslations =
        result.translations[translation.targetLanguage] ?? {};
      const hasAllSegments = translation.segmentIds.every(
        (segmentId) => typeof languageTranslations[segmentId] === "string",
      );

      if (!hasAllSegments) {
        skippedSegments += translation.segmentIds.length;
        return;
      }

      translation.apply(languageTranslations);
      translation.segmentIds.forEach(() => {
        translatedSegments += 1;
      });
      translatedLanguages.add(translation.targetLanguage);
      changedTopLevelFields.add(translation.topLevelField);
    });
  }

  const patch = Object.fromEntries(
    Array.from(changedTopLevelFields).map((fieldName) => [
      fieldName,
      working[fieldName],
    ]),
  );

  return {
    patch,
    summary: {
      requestedLanguages: targetLanguages.map((language) => language.code),
      translatedLanguages: Array.from(translatedLanguages),
      translatedSegments,
      skippedSegments,
      translatedFields: Array.from(changedTopLevelFields),
    },
  };
};
