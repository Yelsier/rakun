import z from "zod";
import { TranslatableValue } from "../../../lib/types";

export type RouteDefinition = {
  key: string;
  contentType: string; // TODO: use enum or literal types
  field: string;
  iterator: string;
  hasPage: boolean;
  dynamic: boolean;
  layout?: readonly RouteLayoutItemDefinition[];
  parentKey?: string;
  parentRelationField?: string;
  defaultBasePath: string | Partial<Record<string, string>>;
  infoSchema?: z.ZodTypeAny;
};

export type RouteLayoutModuleDefinition = {
  type?: "module";
  key: string;
  contentType: string;
};

export type RouteLayoutContentDefinition = {
  type: "content";
};

export type RouteLayoutItemDefinition =
  | RouteLayoutModuleDefinition
  | RouteLayoutContentDefinition;

export const getRouteLayoutItems = (
  definition: RouteDefinition,
): readonly RouteLayoutItemDefinition[] =>
  definition.layout ?? [{ type: "content" as const }];

export const getRouteLayoutModules = (
  definition: RouteDefinition,
): Array<RouteLayoutModuleDefinition & { order: number }> =>
  getRouteLayoutItems(definition)
    .map((item, order) => ({ item, order }))
    .filter(
      (
        entry,
      ): entry is { item: RouteLayoutModuleDefinition; order: number } =>
        entry.item.type !== "content",
    )
    .map(({ item, order }) => ({ ...item, order }));

export const getRouteLayoutContentOrder = (
  definition: RouteDefinition,
): number => {
  const index = getRouteLayoutItems(definition).findIndex(
    (item) => item.type === "content",
  );

  return index === -1 ? getRouteLayoutItems(definition).length : index;
};

export const routeSignature = (route: {
  contentType: string;
  field: string;
}): string => `${route.contentType}:${route.field}`;

export type RouteKey = string;
export type RouteKeys = RouteKey;

export const createTranslatableBasePath = (
  value: RouteDefinition["defaultBasePath"],
  locales: readonly string[],
): TranslatableValue<string> => {
  const basePath: TranslatableValue<string> = {
    _tag: "Translatable",
  };

  for (const locale of locales) {
    basePath[locale] =
      typeof value === "string" ? value : ((value[locale] ?? "") as string);
  }

  return basePath;
};
