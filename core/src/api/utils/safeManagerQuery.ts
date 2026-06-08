import type ContentType from "../../lib/ContentType";
import { throwAppError } from "../../lib/errors";
import type { Query } from "../../lib/types";

const MAX_LIMIT = 100;
const MAX_ALL_LIMIT = 1000;
const MAX_CONTAINS_LENGTH = 120;
const MAX_LOGICAL_ITEMS = 25;
const MAX_ARRAY_OPERATOR_ITEMS = 100;

const systemFields = new Set([
  "_id",
  "_type",
  "_schemaVersion",
  "_visibility",
  "_visibilityBeforeTrash",
  "_trashed",
  "_revision",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "trashedAt",
  "trashedBy",
]);

const comparisonOperators = new Set([
  "$eq",
  "$ne",
  "$in",
  "$nin",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$exists",
  "$contains",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const validationError = (message: string): never =>
  throwAppError("VALIDATION", {
    errors: [{ message }],
  });

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasOperatorKeys = (value: Record<string, unknown>) =>
  Object.keys(value).some((key) => key.startsWith("$"));

const assertPlainValue = (value: unknown, path: string): unknown => {
  if (value instanceof RegExp || typeof value === "function") {
    validationError(`Invalid value for ${path}`);
  }

  if (Array.isArray(value)) {
    return value.map((item) => assertPlainValue(item, path));
  }

  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$")) {
        validationError(`Operator ${key} is not allowed inside ${path}`);
      }
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        assertPlainValue(item, `${path}.${key}`),
      ]),
    );
  }

  return value;
};

const isWriteOnlyField = (contentType: ContentType, fieldPath: string) => {
  const root = fieldPath.split(".")[0];
  const field = root ? contentType.fields[root] : undefined;
  return field?.getConfig().ui === "Password";
};

const isAllowedFieldPath = (contentType: ContentType, fieldPath: string) => {
  if (!fieldPath || fieldPath.startsWith("$") || fieldPath.includes("\0")) {
    return false;
  }

  const root = fieldPath.split(".")[0];
  if (!root) return false;
  if (systemFields.has(root)) return true;

  return root in contentType.fields && !isWriteOnlyField(contentType, fieldPath);
};

const assertAllowedFieldPath = (
  contentType: ContentType,
  fieldPath: string,
  usage: string,
) => {
  if (!isAllowedFieldPath(contentType, fieldPath)) {
    validationError(`Invalid ${usage} field: ${fieldPath}`);
  }
};

const parseContainsOperator = (value: unknown, path: string) => {
  if (typeof value !== "string") {
    validationError(`$contains for ${path} must be a string`);
  }
  const text = value as string;

  if (text.length > MAX_CONTAINS_LENGTH) {
    validationError(
      `$contains for ${path} must be ${MAX_CONTAINS_LENGTH} characters or fewer`,
    );
  }

  return {
    $regex: escapeRegex(text),
    $options: "i",
  };
};

const parseOperatorCondition = (
  condition: Record<string, unknown>,
  path: string,
) => {
  const next: Record<string, unknown> = {};

  for (const [operator, value] of Object.entries(condition)) {
    if (!comparisonOperators.has(operator)) {
      validationError(`Operator ${operator} is not allowed`);
    }

    if (operator === "$contains") {
      Object.assign(next, parseContainsOperator(value, path));
      continue;
    }

    if (operator === "$exists") {
      if (typeof value !== "boolean") {
        validationError(`$exists for ${path} must be a boolean`);
      }
      next[operator] = value;
      continue;
    }

    if (operator === "$in" || operator === "$nin") {
      if (!Array.isArray(value)) {
        validationError(`${operator} for ${path} must be an array`);
      }
      const items = value as unknown[];
      if (items.length > MAX_ARRAY_OPERATOR_ITEMS) {
        validationError(
          `${operator} for ${path} cannot contain more than ${MAX_ARRAY_OPERATOR_ITEMS} items`,
        );
      }
      next[operator] = items.map((item) => assertPlainValue(item, path));
      continue;
    }

    next[operator] = assertPlainValue(value, path);
  }

  return next;
};

const parseFieldCondition = (value: unknown, path: string): unknown => {
  if (!isRecord(value)) {
    return assertPlainValue(value, path);
  }

  if (hasOperatorKeys(value)) {
    return parseOperatorCondition(value, path);
  }

  return assertPlainValue(value, path);
};

const parseFilterObject = (
  contentType: ContentType,
  filter: unknown,
): Record<string, unknown> => {
  if (filter === undefined) return {};
  if (!isRecord(filter)) {
    validationError("manager.list filter must be an object");
  }
  const filterRecord = filter as Record<string, unknown>;

  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filterRecord)) {
    if (key === "$and" || key === "$or") {
      if (!Array.isArray(value)) {
        validationError(`${key} must be an array`);
      }
      const filters = value as unknown[];
      if (filters.length === 0 || filters.length > MAX_LOGICAL_ITEMS) {
        validationError(
          `${key} must contain between 1 and ${MAX_LOGICAL_ITEMS} filters`,
        );
      }
      next[key] = filters.map((item) => parseFilterObject(contentType, item));
      continue;
    }

    assertAllowedFieldPath(contentType, key, "filter");
    next[key] = parseFieldCondition(value, key);
  }

  return next;
};

const parseFields = (
  contentType: ContentType,
  fields: unknown,
): string[] | undefined => {
  if (fields === undefined) return undefined;
  if (!Array.isArray(fields)) {
    validationError("manager.list fields must be an array");
  }
  const fieldList = fields as unknown[];

  return fieldList.map((field) => {
    if (typeof field !== "string") {
      validationError("manager.list fields must be strings");
    }
    const fieldName = field as string;
    assertAllowedFieldPath(contentType, fieldName, "projection");
    return fieldName;
  });
};

const parseSort = (
  contentType: ContentType,
  sort: unknown,
): Record<string, "asc" | "desc"> | undefined => {
  if (sort === undefined) return undefined;
  if (!isRecord(sort)) {
    validationError("manager.list sort must be an object");
  }
  const sortRecord = sort as Record<string, unknown>;
  const next: Record<string, "asc" | "desc"> = {};

  for (const [field, direction] of Object.entries(sortRecord)) {
    assertAllowedFieldPath(contentType, field, "sort");
    if (direction !== "asc" && direction !== "desc") {
      validationError(`Invalid sort direction for ${field}`);
    }
    next[field] = direction as "asc" | "desc";
  }

  return next;
};

const parseLimit = (limit: unknown) => {
  if (limit === undefined) return undefined;
  if (limit === "all") return MAX_ALL_LIMIT;
  if (!Number.isInteger(limit) || Number(limit) < 1) {
    validationError("manager.list limit must be a positive integer");
  }
  return Math.min(Number(limit), MAX_LIMIT);
};

const parsePage = (page: unknown) => {
  if (page === undefined) return undefined;
  if (!Number.isInteger(page) || Number(page) < 1) {
    validationError("manager.list page must be a positive integer");
  }
  return Number(page);
};

export const parseSafeManagerQuery = (
  contentType: ContentType,
  query: Query,
): Query => {
  const options = query.options ?? {};

  return {
    filter: parseFilterObject(contentType, query.filter),
    options: {
      fields: parseFields(contentType, options.fields),
      limit: parseLimit(options.limit),
      page: parsePage(options.page),
      sort: parseSort(contentType, options.sort),
    },
  };
};
