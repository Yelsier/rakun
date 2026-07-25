import {
  RouteMap,
  Language,
  Route,
  RouteLocaleVariant,
} from "../../../internal-content-types";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import {
  getLocaleVariantGroupId,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../../lib/localeVariants";
import { DBOutput } from "../../../lib/types";
import type { DBService } from "../../../orm/dbService";
import {
  deleteMissingRouteMapEntries,
  generateRouteMapItems,
  getRouteFields,
  loadRouteData,
  revalidateRoutePaths,
  updateRouteMapEntries,
  type RouteMapItemInput,
  type RouteLocaleVariantRecord,
} from "./routeMapHelpers";

const activeContentFilter = {
  _trashed: { $ne: true },
  _visibility: { $nin: ["draft", "trash"] },
};

const getRouteLocaleVariants = async (
  db: DBService,
  routeId: string,
): Promise<RouteLocaleVariantRecord[]> => {
  return (
    await db.list(RouteLocaleVariant, {
      filter: { routeId },
      options: {
        limit: "all",
        fields: ["routeId", "groupId", "languageId", "documentId"],
      },
    })
  ).items;
};

const getGroupRouteItems = async ({
  db,
  contentType,
  groupIds,
  route,
}: {
  db: DBService;
  contentType: string;
  groupIds: readonly string[];
  route: DBOutput<Route>;
}) => {
  const contentTypeRecord = getContentTypeByName(contentType)!;
  const fields = getRouteFields(route);

  return (
    await db.list(contentTypeRecord, {
      filter: {
        ...activeContentFilter,
        $or: [
          { _id: { $in: groupIds } },
          { [LOCALE_VARIANT_GROUP_FIELD]: { $in: groupIds } },
        ],
      },
      options: { limit: "all", fields },
    })
  ).items;
};

export const regenerateAllRoutesMap = async (): Promise<void> => {
  Logger.addTrace("routes.regenerateAll: start");
  const { routes, languages, routeSettings, db } = await loadRouteData();
  Logger.addTrace("routes.regenerateAll: data loaded", {
    routes: routes.length,
    languages: languages.length,
    hasRouteSettings: !!routeSettings,
  });

  const prevRoutesMap = await db.getAll(RouteMap);
  Logger.addTrace("routes.regenerateAll: previous map loaded", {
    items: prevRoutesMap.length,
  });

  const routesMap: RouteMapItemInput[] = (
    await Promise.all(
      routes
        .filter((r) => r.hasPage)
        .map(async (route) => {
          const routFields = getRouteFields(route);
          const localeVariants = await getRouteLocaleVariants(db, route._id);
          const routesItems = (
            await db.list(getContentTypeByName(route.contentType), {
              filter: activeContentFilter,
              options: { limit: "all", fields: routFields },
            })
          ).items;

          return await generateRouteMapItems(
            [...routesItems],
            route,
            languages,
            routes,
            routeSettings,
            languages,
            localeVariants,
          );
        }),
    )
  )
    .flat()
    .filter((r) => r !== null);

  Logger.addTrace("routes.regenerateAll: map generated", {
    items: routesMap.length,
  });
  await db.clear(RouteMap);
  Logger.addTrace("routes.regenerateAll: previous map cleared");
  await updateRouteMapEntries(routesMap);
  Logger.addTrace("routes.regenerateAll: entries updated");
  await revalidateRoutePaths(routesMap, prevRoutesMap);
  Logger.addTrace("routes.regenerateAll: revalidation done");
};

export async function updateSingleRouteMap({
  contentType,
  contentTypeId,
}: {
  contentType: string;
  contentTypeId: string;
}): Promise<void> {
  Logger.addTrace("routes.updateSingle: start", {
    contentType,
    contentTypeId,
  });
  const { routes, languages, routeSettings, db } = await loadRouteData();
  Logger.addTrace("routes.updateSingle: data loaded", {
    routes: routes.length,
    languages: languages.length,
    hasRouteSettings: !!routeSettings,
  });

  const item = await db.get(getContentTypeByName(contentType)!, contentTypeId);

  if (!item) {
    Logger.addTrace("routes.updateSingle: item not found", {
      contentType,
      contentTypeId,
    });
    return;
  }

  const route = routes.find((r) => r.contentType === contentType && r.hasPage);
  if (!route) {
    Logger.addTrace("routes.updateSingle: route not found", {
      contentType,
      contentTypeId,
    });
    return;
  }

  const initialPrevRoutesMap = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        contentTypeId,
      },
      options: { limit: "all" },
    })
  ).items;
  const groupIds = Array.from(
    new Set([
      getLocaleVariantGroupId(item),
      ...initialPrevRoutesMap
        .map((routeMap) => routeMap.variantGroupId)
        .filter((value): value is string => typeof value === "string"),
    ]),
  );
  const prevRoutesMap = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        routeId: route._id,
        $or: [
          { variantGroupId: { $in: groupIds } },
          { contentTypeId: { $in: groupIds } },
          { contentTypeId },
        ],
      } as never,
      options: { limit: "all" },
    })
  ).items;
  Logger.addTrace("routes.updateSingle: previous map loaded", {
    items: prevRoutesMap.length,
    groups: groupIds.length,
  });

  const [routesItems, localeVariants] = await Promise.all([
    getGroupRouteItems({ db, contentType, groupIds, route }),
    getRouteLocaleVariants(db, route._id),
  ]);
  const routesMap = await generateRouteMapItems(
    [...routesItems],
    route,
    languages,
    routes,
    routeSettings,
    languages,
    localeVariants,
  );

  Logger.addTrace("routes.updateSingle: map generated", {
    items: routesMap.length,
  });
  await deleteMissingRouteMapEntries(routesMap, prevRoutesMap);
  await updateRouteMapEntries(routesMap);
  Logger.addTrace("routes.updateSingle: entries updated");
  await revalidateRoutePaths(routesMap, prevRoutesMap);
  Logger.addTrace("routes.updateSingle: revalidation done");
}

export async function updateLanguageRoutesMap(
  language: DBOutput<Language>,
): Promise<void> {
  Logger.addTrace("routes.updateLanguage: start", {
    languageId: language._id,
    languageCode: language.code,
  });
  const { routes, languages, routeSettings, db } = await loadRouteData();
  Logger.addTrace("routes.updateLanguage: data loaded", {
    routes: routes.length,
    languages: languages.length,
    hasRouteSettings: !!routeSettings,
  });

  const prevRoutesMap = (
    await db.list(RouteMap, {
      filter: { languageId: language._id },
      options: { limit: "all" },
    })
  ).items;
  Logger.addTrace("routes.updateLanguage: previous map loaded", {
    items: prevRoutesMap.length,
  });

  const routesMap: RouteMapItemInput[] = (
    await Promise.all(
      routes
        .filter((r) => r.hasPage as boolean)
        .map(async (route) => {
          const routFields = getRouteFields(route);
          const localeVariants = await getRouteLocaleVariants(db, route._id);
          const routesItems = (
            await db.list(getContentTypeByName(route.contentType)!, {
              filter: activeContentFilter,
              options: { limit: "all", fields: routFields },
            })
          ).items;

          return await generateRouteMapItems(
            [...routesItems],
            route,
            [language],
            routes,
            routeSettings,
            languages,
            localeVariants,
          );
        }),
    )
  )
    .flat()
    .filter((r) => r !== null);

  Logger.addTrace("routes.updateLanguage: map generated", {
    items: routesMap.length,
  });
  await deleteMissingRouteMapEntries(routesMap, prevRoutesMap);
  await updateRouteMapEntries(routesMap);
  Logger.addTrace("routes.updateLanguage: entries updated");
  await revalidateRoutePaths(routesMap, prevRoutesMap);
  Logger.addTrace("routes.updateLanguage: revalidation done");
}

export async function updateRouteRouteMap(
  route: DBOutput<Route>,
): Promise<void> {
  Logger.addTrace("routes.updateRoute: start", {
    routeId: route._id,
    contentType: route.contentType,
    hasPage: route.hasPage,
  });
  const { routes, db, languages, routeSettings } = await loadRouteData();
  Logger.addTrace("routes.updateRoute: data loaded", {
    routes: routes.length,
    languages: languages.length,
    hasRouteSettings: !!routeSettings,
  });

  // UpdateSubRoutes
  const subRoutes = (
    await db.list(Route, {
      filter: {
        "parent._id": route._id,
      },
    })
  ).items;
  Logger.addTrace("routes.updateRoute: subroutes loaded", {
    items: subRoutes.length,
  });

  await Promise.all(subRoutes.map(updateRouteRouteMap));

  if (!route.hasPage) {
    Logger.addTrace("routes.updateRoute: skipped route without page", {
      routeId: route._id,
    });
    return;
  }

  const prevRoutesMap = (
    await db.list(RouteMap, {
      options: { limit: "all" },
      filter: { routeId: route._id },
    })
  ).items;
  Logger.addTrace("routes.updateRoute: previous map loaded", {
    items: prevRoutesMap.length,
  });

  const routesMap: RouteMapItemInput[] = (
    await (async () => {
      const routFields = getRouteFields(route);
      const localeVariants = await getRouteLocaleVariants(db, route._id);
      const routesItems = (
        await db.list(getContentTypeByName(route.contentType)!, {
          filter: activeContentFilter,
          options: { limit: "all", fields: routFields },
        })
      ).items;

      return await generateRouteMapItems(
        [...routesItems],
        route,
        languages,
        routes,
        routeSettings,
        languages,
        localeVariants,
      );
    })()
  ).filter((r): r is RouteMapItemInput => r !== null);

  Logger.addTrace("routes.updateRoute: map generated", {
    items: routesMap.length,
  });
  await deleteMissingRouteMapEntries(routesMap, prevRoutesMap);
  await updateRouteMapEntries(routesMap);
  Logger.addTrace("routes.updateRoute: entries updated");
  await revalidateRoutePaths(routesMap, prevRoutesMap);
  Logger.addTrace("routes.updateRoute: revalidation done");
}
