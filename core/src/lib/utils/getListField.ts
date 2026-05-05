import type { MaybeTranslatableValue } from "../types";

export const getListField = (
  data: {
    [x: string]: unknown;
    _id: string;
  },
  fields: string[],
): MaybeTranslatableValue<string> => {
  for (const f of fields) {
    if (data[f]) {
      return data[f] as MaybeTranslatableValue<string>;
    }
  }

  if ("_id" in data) {
    return data._id;
  }

  return "[Empty object]";
};
