const dateMarker = "__rakunPreviewDate";

const encodePreviewValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return {
      [dateMarker]: value.toISOString(),
    };
  }

  if (Array.isArray(value)) {
    return value.map(encodePreviewValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        encodePreviewValue(item),
      ]),
    );
  }

  return value;
};

const decodePreviewValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(decodePreviewValue);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (
      Object.keys(record).length === 1 &&
      typeof record[dateMarker] === "string"
    ) {
      return new Date(record[dateMarker]);
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, item]) => [
        key,
        decodePreviewValue(item),
      ]),
    );
  }

  return value;
};

export const serializePreviewData = (value: unknown) =>
  JSON.stringify(encodePreviewValue(value));

export const parsePreviewData = (value: string): unknown =>
  decodePreviewValue(JSON.parse(value));
