import z from "zod";

export const LOCALE_VARIANT_GROUP_FIELD = "_localeVariantGroupId";
export const LOCALE_VARIANT_ROLE_FIELD = "_localeVariantRole";

export const LocaleVariantRole = z.enum(["primary", "variant"]);

export type LocaleVariantRole = z.infer<typeof LocaleVariantRole>;

export type LocaleVariantMetadata = {
  [key: string]: unknown;
  [LOCALE_VARIANT_GROUP_FIELD]?: string;
  [LOCALE_VARIANT_ROLE_FIELD]?: LocaleVariantRole;
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

export const isLocaleVariantDocument = (
  item: LocaleVariantMetadata,
): boolean => getLocaleVariantRole(item) === "variant";
