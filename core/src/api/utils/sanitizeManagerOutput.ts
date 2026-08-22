import type ContentType from "../../lib/ContentType";
import type { AnyField } from "../../lib/fields/Field";
import { getContentTypeByName } from "../../lib/Registry";
import { isRecord } from "../../lib/utils/isRecord";

const sensitiveKeyPattern =
  /(password|token|secret|totp|mfa|challenge|credential|recoveryCode)/i;

const isWriteOnlyField = (field: AnyField) => {
  const config = field.getConfig();
  return config.ui === "Password";
};

const getWriteOnlyFieldNames = (contentType?: ContentType | null) =>
  new Set(
    contentType
      ? Object.entries(contentType.fields)
          .filter(([, field]) => isWriteOnlyField(field))
          .map(([name]) => name)
      : [],
  );

const resolveContentType = (
  contentType: ContentType | undefined,
  value: Record<string, unknown>,
) => {
  if (contentType) return contentType;

  return typeof value._type === "string"
    ? getContentTypeByName(value._type)
    : undefined;
};

export const sanitizeManagerOutput = <T>(
  value: T,
  contentType?: ContentType,
): T => {
  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeManagerOutput(item),
    ) as unknown as T;
  }

  if (value instanceof Date) return value;

  if (!isRecord(value)) return value;

  const resolvedContentType = resolveContentType(contentType, value);
  const writeOnlyFields = getWriteOnlyFieldNames(resolvedContentType);

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (writeOnlyFields.has(key) || sensitiveKeyPattern.test(key)) {
        return [];
      }

      return [[key, sanitizeManagerOutput(item)]];
    }),
  ) as T;
};
