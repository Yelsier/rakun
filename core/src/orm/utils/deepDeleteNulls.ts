import { hasKeys } from "../../lib/utils/hasKeys";

export const deepDeleteNulls = (
  obj: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [
            key,
            value
              .map((item) => (hasKeys(item) ? deepDeleteNulls(item) : item))
              .filter((item) => item !== null && item !== undefined),
          ];
        }
        if (hasKeys(value)) {
          return [key, deepDeleteNulls(value)];
        }
        return [key, value];
      }),
  );
