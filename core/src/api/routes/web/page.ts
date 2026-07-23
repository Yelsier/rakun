import {
  RouteMap,
  Route,
  RouteLayoutModule,
  RouteLayoutModuleOverride,
  Language,
  LiteralTranslation,
  SeoSettings,
} from "../../../internal-content-types";
import type ContentType from "../../../lib/ContentType";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { ITERATOR_FIELD_NAME, SEO_FIELD_NAME } from "../../../lib/systemFields";
import type { DBOutput } from "../../../lib/types";
import { translateObject } from "../../../lib/utils/translateObject";
import { getLiteralDefinitions } from "../../../literals";
import { getMongoService } from "../../../orm";
import {
  PageOutput,
  PageInput,
  PageModule,
} from "../../../schemas/web/page";
import { runContentHookContext } from "../../hooks/context";
import { resolveContentOutput } from "../../utils/dynamicData";
import { getLanguages } from "../../utils/getLanguages";
import { populateLinks } from "../../utils/populates/populateLinks";
import { populateRelations } from "../../utils/populates/populateRelations";
import { resolveRedirect } from "../../utils/redirects/resolveRedirect";
import { validateModule } from "../../utils/validateModule";
import { resolveSeo } from "./seo";
import { applyEffectiveIterator } from "../../utils/linkedIterator";
import { ITERATOR_UNLINKED_FIELD_NAME } from "../../../lib/systemFields";

export const NotFoundResponse: PageOutput = {
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
export const normalizePagePath = (path: string): string => {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  return path;
};

type PageContentData = Record<string, unknown> & {
  _id: string;
  _type: string;
  _trashed?: boolean;
  _visibility?: string;
};

const getSeoAlternatePaths = async ({
  contentType,
  contentTypeId,
  variantGroupId,
  routeId,
  languages,
}: {
  contentType: string;
  contentTypeId: string;
  variantGroupId?: string;
  routeId: string;
  languages: readonly DBOutput<Language>[];
}): Promise<Record<string, string> | undefined> => {
  const db = await getMongoService();
  const languageCodeById = new Map(
    languages.map((language) => [String(language._id), language.code]),
  );
  const routeMaps = (
    await db.list(RouteMap, {
      filter: {
        contentType,
        routeId,
        ...(variantGroupId
          ? { variantGroupId }
          : {
              $or: [
                { contentTypeId },
                { variantGroupId: contentTypeId },
              ],
            }),
      },
      options: {
        limit: "all",
        fields: ["path", "languageId"],
      },
    })
  ).items;

  const entries = routeMaps
    .map((routeMap) => {
      const code = languageCodeById.get(String(routeMap.languageId));
      return code ? ([code, routeMap.path] as const) : null;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

export const buildPageOutput = async ({
  path,
  route,
  contentType,
  contentTypeId,
  variantGroupId,
  data,
  language,
  tracePrefix = "web.page",
  preferDocumentIterator = false,
}: {
  path: string;
  route: DBOutput<Route>;
  contentType: ContentType;
  contentTypeId: string;
  variantGroupId?: string;
  data: PageContentData;
  language: DBOutput<Language>;
  tracePrefix?: string;
  preferDocumentIterator?: boolean;
}): Promise<PageOutput> => {
  const db = await getMongoService();
  const surface = tracePrefix === "web.previewPage" ? "preview" : "web";
  const localeCode = language.code || "en";
  const effectiveData = await applyEffectiveIterator({
    db,
    contentType,
    document: data,
    preferDocument: preferDocumentIterator,
  });
  const iterator = contentType.hasIterator
    ? effectiveData[ITERATOR_FIELD_NAME]
    : [];
  const iteratorModules = Array.isArray(iterator) ? iterator : [];

  return runContentHookContext(
    {
      locale: localeCode,
      surface,
      route: {
        path,
        routeId: route._id,
        contentTypeId,
        type: contentType.name,
      },
    },
    async () => {
      const linksPopulated = await populateLinks(
        effectiveData as DBOutput<ContentType>,
      );
      Logger.addTrace(`${tracePrefix}: links populated`);

      const populated = await populateRelations(
        linksPopulated as DBOutput<ContentType>,
      );
      Logger.addTrace(`${tracePrefix}: relations populated`);

      const output = await resolveContentOutput({
        db,
        contentType,
        data: populated as never,
        surface,
      });
      Logger.addTrace(`${tracePrefix}: output resolved`);

      const languages = await getLanguages();
      const populatedTranslated = translateObject(output, language, languages);
      Logger.addTrace(`${tracePrefix}: content translated`);

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
      Logger.addTrace(`${tracePrefix}: literals resolved`, {
        locale: localeCode,
        count: Object.keys(literalMap).length,
      });

      const {
        [ITERATOR_FIELD_NAME]: modules = iteratorModules,
        [ITERATOR_UNLINKED_FIELD_NAME]: _iteratorUnlinked,
        [SEO_FIELD_NAME]: seo,
        ...info
      } = populatedTranslated;
      const contentModulesSource = Array.isArray(modules) ? modules : [];

      return runContentHookContext(
        {
          locale: localeCode,
          surface,
          route: {
            path,
            routeId: route._id,
            contentTypeId,
            type: contentType.name,
            info: info as Record<string, unknown>,
          },
        },
        async () => {
          const seoSettingsRaw = await db.find(SeoSettings, {
            key: "default",
          });
          const seoSettings = seoSettingsRaw
            ? translateObject(
                await populateRelations(await populateLinks(seoSettingsRaw)),
                language,
                languages,
              )
            : null;
          const seoSettingsRecord =
            seoSettings as Record<string, unknown> | null;
          const alternatePaths = await getSeoAlternatePaths({
            contentType: contentType.name,
            contentTypeId,
            variantGroupId,
            routeId: route._id,
            languages,
          });
          const resolvedSeo = resolveSeo({
            pageSeo: seo as Record<string, unknown> | undefined,
            defaultSeo: seoSettingsRecord?.defaultSeo as
              | Record<string, unknown>
              | undefined,
            settings: seoSettingsRecord,
            alternatePaths,
            path,
          });

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
                contentTypeId,
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
                const moduleId = override
                  ? override.moduleId
                  : selection.moduleId;

                if (!moduleId) {
                  return [selection.key, null] as const;
                }

                const layoutContentType = getContentTypeByName(
                  selection.contentType,
                );
                if (!layoutContentType) {
                  return [selection.key, null] as const;
                }

                const layoutData = await db.get(layoutContentType, moduleId);
                if (!layoutData) {
                  return [selection.key, null] as const;
                }

                const layoutPopulated = await populateRelations(
                  await populateLinks(layoutData),
                );
                const layoutResolved = await resolveContentOutput({
                  db,
                  contentType: layoutContentType,
                  data: layoutPopulated as never,
                  surface,
                });
                const layoutTranslated = translateObject(
                  layoutResolved,
                  language,
                  languages,
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
                ...(contentModulesSource as IterableContentTypes).map((m) => ({
                  ...m.value,
                })),
              ].map(async (item) => {
                const moduleContentType = getContentTypeByName(item._type);
                if (!moduleContentType) return item;

                return await resolveContentOutput({
                  db,
                  contentType: moduleContentType,
                  data: item as never,
                  surface,
                });
              }),
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

          return {
            renderMode: route.dynamic ? "dynamic" : "static",
            ttl: route.dynamic ? undefined : 86400,
            modules: contentModules,
            language,
            seo: resolvedSeo,
            layout,
            info: {
              ...info,
              locale: localeCode,
              variantGroupId: variantGroupId ?? contentTypeId,
              literals: literalMap,
            },
          };
        },
      );
    },
  );
};

export const getPage = async (input: PageInput): Promise<PageOutput> => {
  const path = normalizePagePath(input.path);
  try {
    const db = await getMongoService();

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

    if (
      data._trashed === true ||
      data._visibility === "draft" ||
      data._visibility === "trash"
    ) {
      return NotFoundResponse;
    }

    const language = await db.get(Language, routeMapEntry.languageId);
    Logger.addTrace("web.page: language loaded", {
      found: !!language,
    });

    return await buildPageOutput({
      path,
      route,
      contentType,
      contentTypeId: routeMapEntry.contentTypeId,
      variantGroupId: routeMapEntry.variantGroupId,
      data,
      language,
    });
  } catch (error) {
    Logger.addTrace("web.page: handler failed");
    Logger.error(`Error fetching page for path ${path}:`, error as Error);
    throwAppError("INTERNAL", {
      traceId: "getPageError",
    });
  }
};
