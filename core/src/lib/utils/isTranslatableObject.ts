import type { TranslatableValue } from "../types";

export const isTranslatableObject = <T>(
  obj: unknown,
): obj is TranslatableValue<T> => {
  return !!(
    obj &&
    typeof obj === "object" &&
    "_tag" in obj &&
    obj._tag === "Translatable"
  );
};
