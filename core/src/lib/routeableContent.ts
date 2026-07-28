import { getRakunBootstrapOptions } from "../bootstrapState";

export const getRouteableFieldNames = (contentTypeName: string): Set<string> =>
  new Set(
    (getRakunBootstrapOptions()?.routes ?? [])
      .filter((route) => route.hasPage && route.contentType === contentTypeName)
      .map((route) => route.field),
  );

export const isRouteableContentType = (contentTypeName: string): boolean =>
  getRouteableFieldNames(contentTypeName).size > 0;

export const isRouteUniqueGroup = (
  contentTypeName: string,
  fields: readonly string[],
): boolean => {
  const routeFields = getRouteableFieldNames(contentTypeName);
  return fields.some((field) => routeFields.has(field));
};

export const getPersistedUniqueGroups = (
  contentTypeName: string,
  uniques: readonly (readonly string[])[],
): Array<readonly string[]> =>
  uniques.filter((fields) => !isRouteUniqueGroup(contentTypeName, fields));
