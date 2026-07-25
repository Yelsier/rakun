import type { IteratorItemVisibilityCondition } from "../../lib/fields/List";

type IteratorItem = {
  visibleWhen?: IteratorItemVisibilityCondition;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getValueAtPath = (
  value: Record<string, unknown>,
  path: string,
): unknown => {
  let current: unknown = value;

  for (const segment of path.split(".")) {
    if (!segment || !isRecord(current)) return undefined;
    current = current[segment];
  }

  return current;
};

const emptyLexicalNodeTypes = new Set([
  "autolink",
  "heading",
  "linebreak",
  "link",
  "list",
  "listitem",
  "paragraph",
  "quote",
  "root",
  "tab",
]);

const isLexicalNodeEmpty = (value: unknown): boolean => {
  if (!isRecord(value)) return isIteratorVisibilityValueEmpty(value);

  if (typeof value.text === "string") {
    return value.text.trim().length === 0;
  }

  if (Array.isArray(value.children)) {
    return value.children.every(isLexicalNodeEmpty);
  }

  if (
    typeof value.type === "string" &&
    emptyLexicalNodeTypes.has(value.type)
  ) {
    return true;
  }

  // Unknown leaf/decorator nodes may represent visible plugin content.
  return false;
};

export const isIteratorVisibilityValueEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null || value === false) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isIteratorVisibilityValueEmpty);
  }
  if (!isRecord(value)) return false;

  if (isRecord(value.root) && Array.isArray(value.root.children)) {
    return value.root.children.every(isLexicalNodeEmpty);
  }

  const entries = Object.entries(value).filter(([key]) => key !== "_tag");
  return (
    entries.length === 0 ||
    entries.every(([, item]) => isIteratorVisibilityValueEmpty(item))
  );
};

export const isIteratorItemVisible = (
  item: IteratorItem,
  currentDocument: Record<string, unknown>,
): boolean => {
  const condition = item.visibleWhen;
  if (!condition) return true;

  const empty = isIteratorVisibilityValueEmpty(
    getValueAtPath(currentDocument, condition.field),
  );

  return condition.operator === "empty" ? empty : !empty;
};
