import z from "zod";

export const LOCALE_VARIANT_GROUP_FIELD = "_localeVariantGroupId";
export const LOCALE_VARIANT_ROLE_FIELD = "_localeVariantRole";
export const LOCALE_VARIANT_NAME_FIELD = "_localeVariantName";

export const LocaleVariantRole = z.enum(["primary", "variant"]);

export type LocaleVariantRole = z.infer<typeof LocaleVariantRole>;

export type LocaleVariantMetadata = {
  [key: string]: unknown;
  [LOCALE_VARIANT_GROUP_FIELD]?: string;
  [LOCALE_VARIANT_ROLE_FIELD]?: LocaleVariantRole;
  [LOCALE_VARIANT_NAME_FIELD]?: string;
};

export type LocaleVariantDocument = LocaleVariantMetadata & {
  _id: string;
};

export const getLocaleVariantGroupId = (
  item: LocaleVariantDocument,
): string =>
  typeof item[LOCALE_VARIANT_GROUP_FIELD] === "string" &&
  item[LOCALE_VARIANT_GROUP_FIELD].length > 0
    ? item[LOCALE_VARIANT_GROUP_FIELD]
    : item._id;

export const getLocaleVariantRole = (
  item: LocaleVariantMetadata,
): LocaleVariantRole =>
  item[LOCALE_VARIANT_ROLE_FIELD] === "variant" ? "variant" : "primary";

export const getLocaleVariantName = (
  item: LocaleVariantMetadata,
): string | undefined => {
  const name = item[LOCALE_VARIANT_NAME_FIELD];
  return typeof name === "string" && name.trim().length > 0
    ? name.trim()
    : undefined;
};

export const isLocaleVariantDocument = (
  item: LocaleVariantMetadata,
): boolean => getLocaleVariantRole(item) === "variant";
