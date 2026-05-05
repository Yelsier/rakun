import { RouteMap, Language, Route } from "../../../internal-content-types";
import { getContentTypeByName } from "../../../lib/Registry";
import { DBOutput } from "../../../lib/types";
import {
  buildRoutePath,
  generateRouteMapItems,
  getParentPath,
  getRouteFields,
  loadRouteData,
  revalidateRoutePaths,
  updateRouteMapEntries,
  type RouteMapItemInput,
} from "./routeMapHelpers";

export const regenerateAllRoutesMap = async (): Promise<void> => {
  const { routes, languages, routeSettings, db } = await loadRouteData();

  const prevRoutesMap = await db.getAll(RouteMap);

  const routesMap: RouteMapItemInput[] = (
    await Promise.all(
      routes
        .filter((r) => r.hasPage)
        .map(async (route) => {
          const routFields = getRouteFields(route);
          const routesItems = (
            await db.list(getContentTypeByName(route.contentType)!, {
              options: { limit: "all", fields: routFields },
            })
          ).items;

          return await generateRouteMapItems(
            [...routesItems],
            route,
            languages,
            routes,
            routeSettings,
          );
        }),
    )
  )
    .flat()
    .filter((r) => r !== null);

  await db.clear(RouteMap);
  await updateRouteMapEntries(routesMap);
  await revalidateRoutePaths(routesMap, prevRoutesMap);
};

export async function updateSingleRouteMap({
  contentType,
  contentTypeId,
}: {
  contentType: string;
  contentTypeId: string;
}): Promise<void> {
  const { routes, languages, routeSettings, db } = await loadRouteData();

  const item = await db.get(getContentTypeByName(contentType)!, contentTypeId);

  if (!item) {
    return;
  }

  const prevRoutesMap = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        contentTypeId,
      },
      options: { limit: "all" },
    })
  ).items;

  const routesMap: RouteMapItemInput[] = (
    await Promise.all(
      languages.map(async (language) => {
        const route = routes.find(
          (r) => r.contentType === contentType && r.hasPage,
        );
        if (!route) return null;
        const parentPath = await getParentPath(
          item,
          route,
          language,
          routes,
          languages,
        );
        return {
          contentTypeId,
          contentType,
          path: buildRoutePath(
            item,
            route,
            language,
            parentPath,
            languages,
            routeSettings,
          ),
          routeId: route._id as string,
          languageId: language._id as string,
          _type: "RouteMap" as const,
        };
      }),
    )
  ).filter((r) => r !== null);

  await updateRouteMapEntries(routesMap);
  await revalidateRoutePaths(routesMap, prevRoutesMap);
}

export async function updateLanguageRoutesMap(
  language: DBOutput<Language>,
): Promise<void> {
  const { routes, routeSettings, db } = await loadRouteData();

  const prevRoutesMap = (
    await db.list(RouteMap, {
      filter: { languageId: language._id },
      options: { limit: "all" },
    })
  ).items;

  const routesMap: RouteMapItemInput[] = (
    await Promise.all(
      routes
        .filter((r) => r.hasPage as boolean)
        .map(async (route) => {
          const routFields = getRouteFields(route);
          const routesItems = (
            await db.list(getContentTypeByName(route.contentType)!, {
              options: { limit: "all", fields: routFields },
            })
          ).items;

          return await generateRouteMapItems(
            [...routesItems],
            route,
            [language],
            routes,
            routeSettings,
          );
        }),
    )
  )
    .flat()
    .filter((r) => r !== null);

  await updateRouteMapEntries(routesMap);
  await revalidateRoutePaths(routesMap, prevRoutesMap);
}

export async function updateRouteRouteMap(
  route: DBOutput<Route>,
): Promise<void> {
  const { routes, db, languages, routeSettings } = await loadRouteData();

  // UpdateSubRoutes
  const subRoutes = (
    await db.list(Route, {
      filter: {
        "parent._id": route._id,
      },
    })
  ).items;

  await Promise.all(subRoutes.map(updateRouteRouteMap));

  if (!route.hasPage) {
    return;
  }

  const prevRoutesMap = (
    await db.list(RouteMap, {
      options: { limit: "all" },
      filter: { routeId: route._id },
    })
  ).items;

  const routesMap: RouteMapItemInput[] = (
    await (async () => {
      const routFields = getRouteFields(route);
      const routesItems = (
        await db.list(getContentTypeByName(route.contentType)!, {
          options: { limit: "all", fields: routFields },
        })
      ).items;

      return await generateRouteMapItems(
        [...routesItems],
        route,
        languages,
        routes,
        routeSettings,
      );
    })()
  ).filter((r): r is RouteMapItemInput => r !== null);

  await updateRouteMapEntries(routesMap);
  await revalidateRoutePaths(routesMap, prevRoutesMap);
}
