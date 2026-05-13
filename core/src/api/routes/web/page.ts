import {
  RouteMap,
  Route,
  RouteLayoutModule,
  RouteLayoutModuleOverride,
  Language,
  LiteralTranslation,
  SeoSchema,
} from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { translateObject } from "../../../lib/utils/translateObject";
import { getLiteralDefinitions } from "../../../literals";
import { getMongoService } from "../../../orm";
import { PageOutput, PageInput, PageModule } from "../../../schemas/web/page";
import { ProxyOutput } from "../../proxies";
import { runProxyContext, ProxyContext } from "../../proxies/context";
import { getLanguages } from "../../utils/getLanguages";
import { populateRelations } from "../../utils/populates/populateRelations";
import { resolveRedirect } from "../../utils/redirects/resolveRedirect";
import { validateModule } from "../../utils/validateModule";

const NotFoundResponse: PageOutput = {
  renderMode: "static",
  ttl: 86400,
  modules: [
    {
      _id: "not-found",
      _type: "NotFound",
    },
  ],
};

type IterableContentTypes = {
  name: string;
  value: Record<string, unknown> & { _type: string; _id: string };
}[];

// Add trailing slash
const normalizePath = (path: string): string => {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  return path;
};

export const getPage = async (input: PageInput): Promise<PageOutput> => {
  const path = normalizePath(input.path);
  Logger.addTrace("web.page: handler start", { path });
  try {
    const db = await getMongoService();
    Logger.addTrace("web.page: mongo service ready");

    const redirect = await resolveRedirect({
      path,
      search: input.search,
      headers: input.headers,
    });
    if (redirect) {
      Logger.addTrace("web.page: redirect resolved", redirect);
      return {
        renderMode: "dynamic",
        modules: [],
        redirect,
      };
    }

    const routeMapEntry = await db.find(RouteMap, {
      path,
    });
    Logger.addTrace("web.page: route map lookup", {
      found: !!routeMapEntry,
    });

    if (!routeMapEntry) return NotFoundResponse;

    const contentType = getContentTypeByName(routeMapEntry.contentType);

    if (!contentType) return NotFoundResponse;

    const route = await db.get(Route, routeMapEntry.routeId);
    Logger.addTrace("web.page: route loaded", {
      found: !!route,
      hasPage: route?.hasPage,
    });

    if (!route || !route.hasPage) return NotFoundResponse;

    const data = await db.get(contentType, routeMapEntry.contentTypeId);
    Logger.addTrace("web.page: content loaded", {
      found: !!data,
      contentType: contentType.name,
    });

    if (!data) return NotFoundResponse;

    if (data._visibility === "draft") return NotFoundResponse;

    const language = await db.get(Language, routeMapEntry.languageId);
    Logger.addTrace("web.page: language loaded", {
      found: !!language,
    });

    const iterator = data[route.iterator];

    if (!iterator || !Array.isArray(iterator)) {
      return NotFoundResponse;
    }

    const populated = await populateRelations(data);
    Logger.addTrace("web.page: relations populated");

    const proxied = await ProxyOutput(populated);

    Logger.addTrace("web.page: output proxied");

    const populatedTranslated = translateObject(
      proxied,
      language,
      await getLanguages(),
    );
    Logger.addTrace("web.page: content translated");

    const localeCode = language?.code || "en";
    const literalDefinitions = getLiteralDefinitions();
    const literalDefaults = Object.fromEntries(
      literalDefinitions.map((literal) => [
        literal.key,
        literal.defaultMessage,
      ]),
    );

    const literalTranslations = await db.list(LiteralTranslation, {
      filter: { locale: localeCode },
      options: { limit: "all" },
    });

    const literalMap = {
      ...literalDefaults,
      ...Object.fromEntries(
        literalTranslations.items.map((item) => [item.key, item.message]),
      ),
    };
    Logger.addTrace("web.page: literals resolved", {
      locale: localeCode,
      count: Object.keys(literalMap).length,
    });

    const { [route.iterator]: modules, ...rest } = populatedTranslated;

    const { seo, ...info } = rest;

    const layoutModuleSelections = (
      await db.list(RouteLayoutModule, {
        filter: { routeId: route._id },
        options: { limit: "all" },
      })
    ).items;
    const layoutModuleOverrides = (
      await db.list(RouteLayoutModuleOverride, {
        filter: {
          routeId: route._id,
          contentTypeId: routeMapEntry.contentTypeId,
        },
        options: { limit: "all" },
      })
    ).items;
    const layoutModuleOverrideByKey = new Map(
      layoutModuleOverrides.map((override) => [override.key, override]),
    );

    const layoutModuleByKey = Object.fromEntries(
      await Promise.all(
        layoutModuleSelections.map(async (selection) => {
          const override = layoutModuleOverrideByKey.get(selection.key);
          const moduleId = override ? override.moduleId : selection.moduleId;

          if (!moduleId) {
            return [selection.key, null] as const;
          }

          const layoutContentType = getContentTypeByName(selection.contentType);
          if (!layoutContentType) {
            return [selection.key, null] as const;
          }

          const layoutData = await db.get(layoutContentType, moduleId);
          if (!layoutData) {
            return [selection.key, null] as const;
          }

          const layoutPopulated = await populateRelations(layoutData);
          const layoutProxied = await ProxyOutput(layoutPopulated);
          const layoutTranslated = translateObject(
            layoutProxied,
            language,
            await getLanguages(),
          );

          return [
            selection.key,
            validateModule(layoutTranslated as PageModule),
          ] as const;
        }),
      ),
    );

    const contentModules = (
      (await Promise.all(
        [
          ...(modules as IterableContentTypes).map((m) => ({
            ...m.value,
          })),
        ].map(ProxyOutput),
      )) as PageModule[]
    ).map(validateModule);

    const layout = [
      ...layoutModuleSelections
        .sort((a, b) => a.order - b.order)
        .map((selection) => ({
          type: "module" as const,
          key: selection.key,
          module: layoutModuleByKey[selection.key] ?? null,
          order: selection.order,
        })),
      {
        type: "content" as const,
        modules: contentModules,
        order: route.layoutContentOrder,
      },
    ]
      .sort((a, b) => a.order - b.order)
      .map(({ order: _order, ...item }) => item);

    return runProxyContext(
      {
        info,
        locale: localeCode,
        type: contentType.name,
      } as ProxyContext,
      async () => {
        return {
          renderMode: route.dynamic ? "dynamic" : "static",
          ttl: route.dynamic ? undefined : 86400,
          modules: contentModules,
          language,
          seo: seo as SeoSchema,
          layout,
          info: {
            ...info,
            locale: localeCode,
            literals: literalMap,
          },
        };
      },
    );
  } catch (error) {
    Logger.addTrace("web.page: handler failed");
    Logger.error(`Error fetching page for path ${path}:`, error as Error);
    throwAppError("INTERNAL", {
      traceId: "getPageError",
    });
  }
};
