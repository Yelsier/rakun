import {
  Route,
  RouteLayoutModule,
  RouteLayoutModuleOverride,
  RouteMap,
} from "../../../internal-content-types";
import { getRakunBootstrapOptions } from "../../../bootstrapState";
import { DBOutput, DataInput } from "../../../lib/types";
import { getMongoService } from "../../../orm";
import { getLanguages } from "../getLanguages";
import {
  createTranslatableBasePath,
  getRouteLayoutContentOrder,
  getRouteLayoutModules,
  RouteDefinition,
  routeSignature,
} from "./routeDefinitions";

const buildRoutePayload = ({
  definition,
  existingRoute,
  localeCodes,
}: {
  definition: RouteDefinition;
  existingRoute?: DBOutput<typeof Route>;
  localeCodes: readonly string[];
}): DataInput<typeof Route> => ({
  _type: "Route",
  basePath:
    existingRoute?.basePath ??
    createTranslatableBasePath(definition.defaultBasePath, localeCodes),
  contentType: definition.contentType,
  field: definition.field,
  iterator: definition.iterator,
  hasPage: definition.hasPage,
  dynamic: definition.dynamic,
  layoutContentOrder: getRouteLayoutContentOrder(definition),
});

export async function syncConfiguredRoutes(): Promise<DBOutput<typeof Route>[]> {
  const routeDefinitions = getRakunBootstrapOptions()?.routes ?? [];
  const db = await getMongoService();
  const languages = await getLanguages();
  const localeCodes = languages.map((language) => language.code);
  const existingRoutes = (await db.list(Route, { options: { limit: "all" } }))
    .items;

  const existingBySignature = new Map(
    existingRoutes.map((route) => [routeSignature(route), route]),
  );
  const routesByKey = new Map<string, DBOutput<typeof Route>>();

  for (const definition of routeDefinitions) {
    const existingRoute = existingBySignature.get(routeSignature(definition));
    const payload = buildRoutePayload({
      definition,
      existingRoute,
      localeCodes,
    });

    const route = existingRoute
      ? await db.update(Route, existingRoute._id, payload)
      : await db.create(Route, payload);

    routesByKey.set(definition.key, route);
  }

  for (const definition of routeDefinitions) {
    const route = routesByKey.get(definition.key);
    if (!route) continue;

    const parent = definition.parentKey
      ? routesByKey.get(definition.parentKey)
      : undefined;
    const nextParent = parent
      ? {
          type: "self" as const,
          _id: parent._id,
          contentType: "Route" as const,
        }
      : null;

    const hasChangedParent =
      (route.parent?._id ?? null) !== (nextParent?._id ?? null) ||
      (route.parentRelationField ?? null) !==
        (definition.parentRelationField ?? null);

    if (!hasChangedParent) continue;

    const updated = await db.update(Route, route._id, {
      parent: nextParent,
      parentRelationField: definition.parentRelationField ?? null,
    });

    routesByKey.set(definition.key, updated);
  }

  const existingLayoutModules = (
    await db.list(RouteLayoutModule, { options: { limit: "all" } })
  ).items;
  const existingLayoutModuleBySignature = new Map(
    existingLayoutModules.map((item) => [`${item.routeId}:${item.key}`, item]),
  );
  const allowedLayoutModuleSignatures = new Set<string>();

  for (const definition of routeDefinitions) {
    const route = routesByKey.get(definition.key);
    if (!route) continue;

    for (const layoutModule of getRouteLayoutModules(definition)) {
      const signature = `${route._id}:${layoutModule.key}`;
      allowedLayoutModuleSignatures.add(signature);
      const existing = existingLayoutModuleBySignature.get(signature);

      if (existing && existing.contentType !== layoutModule.contentType) {
        await db.delete(RouteLayoutModule, { _id: existing._id });
        await db.delete(RouteLayoutModuleOverride, {
          routeId: route._id,
          key: layoutModule.key,
        });
        await db.create(RouteLayoutModule, {
          _type: "RouteLayoutModule",
          routeId: route._id,
          routeKey: definition.key,
          routeContentType: definition.contentType,
          key: layoutModule.key,
          contentType: layoutModule.contentType,
          order: layoutModule.order,
        });
        continue;
      }

      const payload = {
        _type: "RouteLayoutModule" as const,
        routeId: route._id,
        routeKey: definition.key,
        routeContentType: definition.contentType,
        key: layoutModule.key,
        contentType: layoutModule.contentType,
        order: layoutModule.order,
        ...(existing?.moduleId ? { moduleId: existing.moduleId } : {}),
      };

      if (existing) {
        await db.update(RouteLayoutModule, existing._id, payload);
      } else {
        await db.create(RouteLayoutModule, payload);
      }
    }
  }

  for (const item of existingLayoutModules) {
    if (!allowedLayoutModuleSignatures.has(`${item.routeId}:${item.key}`)) {
      await db.delete(RouteLayoutModule, { _id: item._id });
      await db.delete(RouteLayoutModuleOverride, {
        routeId: item.routeId,
        key: item.key,
      });
    }
  }

  const allowedSignatures = new Set(routeDefinitions.map(routeSignature));
  const obsoleteRoutes = existingRoutes.filter(
    (route) => !allowedSignatures.has(routeSignature(route)),
  );

  // Delete child routes first to avoid stale self-references while pruning.
  obsoleteRoutes.sort((a, b) => Number(!!b.parent) - Number(!!a.parent));

  for (const route of obsoleteRoutes) {
    await db.delete(RouteLayoutModule, { routeId: route._id });
    await db.delete(RouteLayoutModuleOverride, { routeId: route._id });
    await db.delete(RouteMap, { routeId: route._id });
    await db.delete(Route, { _id: route._id });
  }

  return Array.from(routesByKey.values());
}
