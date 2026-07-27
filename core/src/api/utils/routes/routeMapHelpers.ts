import { revalidatePath } from "./revalidatePath";
import { getLanguages } from "../getLanguages";
import { syncConfiguredRoutes } from "./syncConfiguredRoutes";
import {
  RouteMap,
  Route,
  Language,
  RouteSettings,
  RouteLocaleVariant,
} from "../../../internal-content-types";
import { getContentTypeByName } from "../../../lib/Registry";
import {
  getLocaleVariantGroupId,
  LOCALE_VARIANT_GROUP_FIELD,
  LOCALE_VARIANT_ROLE_FIELD,
} from "../../../lib/localeVariants";
import { DataInput, DBOutput, TranslatableValue } from "../../../lib/types";
import { getMongoService } from "../../../orm";
import { DbErrorConflict, type DBService } from "../../../orm/dbService";

export type UnknownItem = {
  [x: string]: unknown;
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type RouteMapItemInput = DataInput<RouteMap>;
export type RouteLocaleVariantRecord = Pick<
  DBOutput<RouteLocaleVariant>,
  "routeId" | "groupId" | "languageId" | "documentId"
>;

export const isVisibleForRouteMap = (item: UnknownItem): boolean =>
  item._trashed !== true &&
  item._visibility !== "draft" &&
  item._visibility !== "trash";

export async function loadRouteData(): Promise<{
  routes: readonly DBOutput<Route>[];
  languages: readonly DBOutput<Language>[];
  routeSettings: DBOutput<RouteSettings> | null;
  db: DBService;
}> {
  const db = await getMongoService();
  const routes = await syncConfiguredRoutes();
  const languages = await getLanguages();
  const routeSettings = await db.find(RouteSettings, {
    key: "default",
  });
  return { routes, languages, routeSettings, db };
}

export const isHomePageRouteItem = ({
  item,
  route,
  routeSettings,
  homeGroupId,
}: {
  item: UnknownItem;
  route: DBOutput<Route>;
  routeSettings: DBOutput<RouteSettings> | null;
  homeGroupId?: string;
}): boolean => {
  if (route.contentType !== "Page") return false;

  const homePage = routeSettings?.homePage as { _id?: string } | undefined;
  const itemGroupId = getLocaleVariantGroupId(item);

  return (
    homeGroupId === itemGroupId ||
    homePage?._id === item._id ||
    homePage?._id === itemGroupId
  );
};

export const getParentPath = (
  item: UnknownItem,
  route: DBOutput<Route>,
  language: DBOutput<Language>,
  routes: readonly DBOutput<Route>[],
  languages: readonly DBOutput<Language>[],
  translationLanguages: readonly DBOutput<Language>[] = languages,
): Promise<string> =>
  (async () => {
    const parentRelation = route.parent as DBOutput<Route> | undefined;
    const parentRelationField = route.parentRelationField as string | undefined;
    if (!parentRelation || !parentRelationField) return "";

    const parent = routes.find((r) => r._id === parentRelation._id);
    if (!parent) return "";

    const db = await getMongoService();
    const parentItem = await db.get(
      getContentTypeByName(parent.contentType as string)!,
      (item[parentRelationField] as { _id: string })._id,
    );
    const parentSlug = parentItem[
      parent.field as string
    ] as TranslatableValue<string>;

    const parentPath = await getParentPath(
      item,
      parent,
      language,
      routes,
      languages,
      translationLanguages,
    );

    return `/${parentPath}/${translate(
      parent.basePath as TranslatableValue<string>,
      language,
      [...translationLanguages],
    )}/${translate(parentSlug, language, [...translationLanguages])}`.replace(
      /\/\/+/g,
      "/",
    );
  })();

export const getLanguagePathPrefix = (language: DBOutput<Language>): string =>
  language.default === true ? "" : (language.code as string);

export const buildRoutePath = (
  item: UnknownItem,
  route: DBOutput<Route>,
  language: DBOutput<Language>,
  parentPath: string,
  languages: readonly DBOutput<Language>[],
  routeSettings: DBOutput<RouteSettings> | null,
  homeGroupId?: string,
): string => {
  const languagePrefix = getLanguagePathPrefix(language);
  if (isHomePageRouteItem({ item, route, routeSettings, homeGroupId })) {
    return `/${languagePrefix}/`.replace(/\/\/+/g, "/");
  }

  const routeSegment =
    item._visibility === "hidden"
      ? item._id
      : translate(
          item[route.field as string] as TranslatableValue<string> | string,
          language,
          [...languages],
        );

  return `/${languagePrefix}/${parentPath}/${translate(
    route.basePath as TranslatableValue<string>,
    language,
    [...languages],
  )}/${routeSegment}/`.replace(/\/\/+/g, "/");
};

export const getRouteFields = (route: DBOutput<Route>) => {
  const routFields = [
    route.field as string,
    LOCALE_VARIANT_GROUP_FIELD,
    LOCALE_VARIANT_ROLE_FIELD,
    "_visibility",
    "_trashed",
    "createdAt",
    "updatedAt",
  ];
  if (route.parent && route.parentRelationField) {
    routFields.push(route.parentRelationField as string);
  }
  return routFields;
};

export const getRouteMapLastModified = (item: UnknownItem): Date =>
  item.updatedAt ?? item.createdAt ?? new Date();

type RouteItemGroup = {
  groupId: string;
  itemsById: Map<string, UnknownItem>;
};

const hasRouteFieldValue = (item: UnknownItem, route: DBOutput<Route>) =>
  Boolean(item[route.field as string]);

const groupRouteItems = (
  items: readonly UnknownItem[],
  route: DBOutput<Route>,
): RouteItemGroup[] => {
  const groups = new Map<string, RouteItemGroup>();

  for (const item of items) {
    if (!isVisibleForRouteMap(item)) continue;
    if (!hasRouteFieldValue(item, route)) continue;

    const groupId = getLocaleVariantGroupId(item);
    const group =
      groups.get(groupId) ??
      ({
        groupId,
        itemsById: new Map<string, UnknownItem>(),
      } satisfies RouteItemGroup);

    group.itemsById.set(item._id, item);

    groups.set(groupId, group);
  }

  return Array.from(groups.values());
};

const resolveRouteItemForLanguage = ({
  group,
  language,
  route,
  localeVariants,
}: {
  group: RouteItemGroup;
  language: DBOutput<Language>;
  route: DBOutput<Route>;
  localeVariants: readonly RouteLocaleVariantRecord[];
}): UnknownItem | null => {
  const assignment = localeVariants.find(
    (item) =>
      item.routeId === route._id &&
      item.groupId === group.groupId &&
      item.languageId === language._id,
  );
  if (!assignment) return null;

  const item = group.itemsById.get(assignment.documentId);
  return item && isVisibleForRouteMap(item) && hasRouteFieldValue(item, route)
    ? item
    : null;
};

/**
 *  Generates route map items for a given content items, route and language, including parent paths.
 * @param items - The content items to generate route map entries for.
 * @param route  - The route configuration to use for generating paths.
 * @param languages  - The list of languages to generate paths for.
 * @param routes  - The list of all routes, used for resolving parent routes.
 * @returns A promise that resolves to an array of route map items.
 */
export const generateRouteMapItems = (
  items: readonly UnknownItem[],
  route: DBOutput<Route>,
  languages: readonly DBOutput<Language>[],
  routes: readonly DBOutput<Route>[],
  routeSettings: DBOutput<RouteSettings> | null,
  translationLanguages: readonly DBOutput<Language>[] = languages,
  localeVariants: readonly RouteLocaleVariantRecord[] = [],
) =>
  (async () => {
    const result: RouteMapItemInput[] = [];
    const groups = groupRouteItems(items, route);
    const homePageId = (routeSettings?.homePage as { _id?: string } | undefined)
      ?._id;

    for (const group of groups) {
      const homeGroupId =
        route.contentType === "Page" &&
        homePageId &&
        (group.groupId === homePageId || group.itemsById.has(homePageId))
          ? group.groupId
          : undefined;

      for (const language of languages) {
        const item = resolveRouteItemForLanguage({
          group,
          language,
          route,
          localeVariants,
        });
        if (!item) continue;

        const parentPath = await getParentPath(
          item,
          route,
          language,
          routes,
          languages,
          translationLanguages,
        );
        result.push({
          contentTypeId: item._id,
          contentType: route.contentType as string,
          variantGroupId: group.groupId,
          path: buildRoutePath(
            item,
            route,
            language,
            parentPath,
            translationLanguages,
            routeSettings,
            homeGroupId,
          ),
          routeId: route._id as string,
          languageId: language._id as string,
          lastModified: getRouteMapLastModified(item),
          _type: "RouteMap",
        });
      }
    }
    return result;
  })();

export async function updateRouteMapEntries(
  routesMap: RouteMapItemInput[],
): Promise<void> {
  const db = await getMongoService();

  for (const route of routesMap) {
    const resolution = await resolveRouteMapEntry(db, route);

    if (resolution.action === "update") {
      await db.update(RouteMap, resolution.existing._id, route);
    } else if (resolution.action === "replace") {
      await db.delete(RouteMap, { _id: resolution.existing._id });
      await db.create(RouteMap, route);
    } else if (resolution.action === "create") {
      await db.create(RouteMap, route);
    } else {
      throwRoutePathConflict(route, resolution.existing);
    }
  }
}

export async function assertRouteMapEntriesAvailable(
  routesMap: RouteMapItemInput[],
): Promise<void> {
  const db = await getMongoService();

  for (const route of routesMap) {
    const resolution = await resolveRouteMapEntry(db, route);

    if (resolution.action === "conflict") {
      throwRoutePathConflict(route, resolution.existing);
    }
  }
}

const getRouteMapIdentity = (
  route: Pick<
    RouteMapItemInput,
    "contentType" | "contentTypeId" | "languageId" | "routeId" | "variantGroupId"
  >,
) => ({
  contentType: route.contentType,
  routeId: route.routeId,
  languageId: route.languageId,
  variantGroupId: route.variantGroupId ?? route.contentTypeId,
});

const routeMapIdentityKey = (
  route: Pick<
    RouteMapItemInput,
    "contentType" | "contentTypeId" | "languageId" | "routeId" | "variantGroupId"
  >,
) => {
  const identity = getRouteMapIdentity(route);
  return [
    identity.contentType,
    identity.routeId,
    identity.languageId,
    identity.variantGroupId,
  ].join(":");
};

export async function deleteMissingRouteMapEntries(
  routesMap: RouteMapItemInput[],
  prevRoutesMap: DBOutput<RouteMap>[],
): Promise<void> {
  const db = await getMongoService();
  const nextKeys = new Set(routesMap.map(routeMapIdentityKey));

  await Promise.all(
    prevRoutesMap
      .filter((route) => !nextKeys.has(routeMapIdentityKey(route)))
      .map((route) => db.delete(RouteMap, { _id: route._id })),
  );
}

const isSameRouteMapOwner = (
  existing: DBOutput<RouteMap>,
  next: RouteMapItemInput,
) =>
  existing.contentType === next.contentType &&
  String(existing.routeId) === String(next.routeId) &&
  String(existing.variantGroupId ?? existing.contentTypeId) ===
    String(next.variantGroupId ?? next.contentTypeId) &&
  String(existing.languageId) === String(next.languageId);

type RouteMapEntryResolution =
  | { action: "create" }
  | {
      action: "update" | "replace" | "conflict";
      existing: DBOutput<RouteMap>;
    };

const resolveRouteMapEntry = async (
  db: DBService,
  route: RouteMapItemInput,
): Promise<RouteMapEntryResolution> => {
  const identity = getRouteMapIdentity(route);
  const existingByIdentity =
    (await db.find(RouteMap, identity)) ??
    (await db.find(RouteMap, {
      contentType: route.contentType,
      routeId: route.routeId,
      languageId: route.languageId,
      contentTypeId: route.variantGroupId ?? route.contentTypeId,
    }));

  if (existingByIdentity) {
    return { action: "update", existing: existingByIdentity };
  }

  const existingByPath = await db.find(RouteMap, { path: route.path });

  if (!existingByPath) {
    return { action: "create" };
  }

  if (isSameRouteMapOwner(existingByPath, route)) {
    return { action: "update", existing: existingByPath };
  }

  if (await isStaleRouteMapEntry(db, existingByPath)) {
    return { action: "replace", existing: existingByPath };
  }

  return { action: "conflict", existing: existingByPath };
};

const throwRoutePathConflict = (
  route: RouteMapItemInput,
  existing: DBOutput<RouteMap>,
): never => {
  throw new DbErrorConflict(
    "Route path conflict",
    `Path ${route.path} is already used by ${existing.contentType} (${existing.contentTypeId})`,
  );
};

const isStaleRouteMapEntry = async (
  db: DBService,
  routeMap: DBOutput<RouteMap>,
) => {
  const contentType = getContentTypeByName(routeMap.contentType);

  if (!contentType) return true;

  try {
    const item = await db.get(contentType, routeMap.contentTypeId);
    return item._trashed === true || item._visibility === "draft" || item._visibility === "trash";
  } catch {
    return true;
  }
};

export async function revalidateRoutePaths(
  routesMap: RouteMapItemInput[],
  prevRoutesMap?: RouteMapItemInput[],
): Promise<void> {
  const pathsToRevalidate: Set<string> = new Set(
    routesMap.map((route) => route.path),
  );

  if (prevRoutesMap) {
    prevRoutesMap.forEach((route) => pathsToRevalidate.add(route.path));
  }

  await Promise.all(
    Array.from(pathsToRevalidate).map((path) => revalidatePath(path)),
  );
}

// Simple local translation helper to replace missing core util
function translate(
  value: TranslatableValue<string> | string,
  language: DBOutput<Language>,
  languages: readonly DBOutput<Language>[],
): string {
  if (typeof value === "string") return value;
  const code = language.code as string;
  const fromLang = value[code as keyof typeof value];
  if (fromLang) return fromLang;
  const parent = languages.find((candidate) => candidate._id === language.parent?._id);
  if (parent) {
    return translate(value, parent, languages);
  }
  const defaultLanguage = languages.find((candidate) => candidate.default);
  if (defaultLanguage && defaultLanguage._id !== language._id) {
    return translate(value, defaultLanguage, languages);
  }
  // fallback to first available key (excluding _tag)
  const keys = Object.keys(value).filter((k) => k !== "_tag");
  const firstKey = keys[0];
  return firstKey
    ? ((value[firstKey as keyof typeof value] as string) ?? "")
    : "";
}
