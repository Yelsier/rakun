import { Route, RouteMap } from "../../internal-content-types";
import { getRakunBootstrapOptions } from "../../bootstrapState";
import { throwAppError } from "../../lib/errors";
import { TranslatableValue } from "../../lib/types";
import { getMongoService } from "../../orm";
import { RouteKeys } from "./routes/routeDefinitions";

export const getLink = async (
  key: RouteKeys,
  id: string,
): Promise<TranslatableValue<string>> => {
  const db = await getMongoService();

  const configuredRoute = getRakunBootstrapOptions()?.routes?.find(
    (route) => route.key === key,
  );

  if (!configuredRoute) {
    throwAppError("INTERNAL", {
      message: `No configured route found for key: ${key}`,
    });
  }

  const route = await db.find(Route, {
    field: configuredRoute.field,
    contentType: configuredRoute.contentType,
  });

  if (!route) {
    throwAppError("INTERNAL", {
      message: `No route found for content type: ${configuredRoute.contentType} and field: ${configuredRoute.field}`,
    });
  }

  const routeMapsByGroup = await db.list(RouteMap, {
    filter: {
      routeId: route._id,
      variantGroupId: id,
    },
    options: { limit: "all", fields: ["path"] },
  });
  const { items } =
    routeMapsByGroup.items.length > 0
      ? routeMapsByGroup
      : await db.list(RouteMap, {
          filter: {
            routeId: route._id,
            contentTypeId: id,
          },
          options: { limit: "all", fields: ["path"] },
        });

  return Object.fromEntries(
    items
      .map((item) => [item.path.split("/")[1], item.path])
      .concat([["_tag", "Translatable"]]),
  );
};

export const getTranslatedLink = async (
  key: RouteKeys,
  id: string,
  locale: string,
): Promise<string> => {
  return (await getLink(key, id))[locale] || "";
};
