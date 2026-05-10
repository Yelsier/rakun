import { revalidatePath } from "./revalidatePath";
import { getLanguages } from "../getLanguages";
import { syncConfiguredRoutes } from "./syncConfiguredRoutes";
import {
  RouteMap,
  Route,
  Language,
  RouteSettings,
} from "../../../internal-content-types";
import { getContentTypeByName } from "../../../lib/Registry";
import { DataInput, DBOutput, TranslatableValue } from "../../../lib/types";
import { getMongoService } from "../../../orm";
import { DBService } from "../../../orm/dbService";

export type UnknownItem = {
  [x: string]: unknown;
  _id: string;
};

export type RouteMapItemInput = DataInput<RouteMap>;

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
}: {
  item: UnknownItem;
  route: DBOutput<Route>;
  routeSettings: DBOutput<RouteSettings> | null;
}): boolean => {
  if (route.contentType !== "Page") return false;

  const homePage = routeSettings?.homePage as { _id?: string } | undefined;

  return homePage?._id === item._id;
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

export const buildRoutePath = (
  item: UnknownItem,
  route: DBOutput<Route>,
  language: DBOutput<Language>,
  parentPath: string,
  languages: readonly DBOutput<Language>[],
  routeSettings: DBOutput<RouteSettings> | null,
): string => {
  const code = language.code as string;
  if (isHomePageRouteItem({ item, route, routeSettings })) {
    return `/${code}/`;
  }

  return `/${code}/${parentPath}/${translate(
    route.basePath as TranslatableValue<string>,
    language,
    [...languages],
  )}/${translate(
    item[route.field as string] as TranslatableValue<string> | string,
    language,
    [...languages],
  )}/`.replace(/\/\/+/g, "/");
};

export const getRouteFields = (route: DBOutput<Route>) => {
  const routFields = [route.field as string];
  if (route.parent && route.parentRelationField) {
    routFields.push(route.parentRelationField as string);
  }
  return routFields;
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
) =>
  (async () => {
    const result: RouteMapItemInput[] = [];
    for (const language of languages) {
      for (const item of items) {
        if (!item[route.field as string]) continue;
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
          path: buildRoutePath(
            item,
            route,
            language,
            parentPath,
            translationLanguages,
            routeSettings,
          ),
          routeId: route._id as string,
          languageId: language._id as string,
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
  await Promise.all(
    routesMap.map((route) =>
      db.upsert(
        RouteMap,
        {
          contentTypeId: route.contentTypeId,
          contentType: route.contentType,
          routeId: route.routeId,
          languageId: route.languageId,
        },
        route,
      ),
    ),
  );
}

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
