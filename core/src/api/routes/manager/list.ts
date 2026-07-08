import { Logger } from "../../../lib/Logger";
import { getContentPermission, hasPermissions } from "../../../lib/Permissions";
import { Media } from "../../../internal-content-types";
import { getRakunBootstrapOptions } from "../../../bootstrapState";
import { LOCALE_VARIANT_ROLE_FIELD } from "../../../lib/localeVariants";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { ListInput } from "../../../schemas/manager/list";
import { checkAnyPermissions } from "../../utils/checkPermissions";
import { populateRelations } from "../../utils/populates/populateRelations";
import { requireContentType } from "../../utils/requireContentType";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";
import { parseSafeManagerQuery } from "../../utils/safeManagerQuery";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";
import { resolveMediaRecordUrls } from "./media/resolveMediaRecordUrls";

export const listHandler = async ({
  input,
  ctx,
}: {
  input: ListInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName } = input;
  const contentType = requireContentType(contentTypeName);
  const query = parseSafeManagerQuery(contentType, input.query);
  const user = ctx.getUser();

  const ownPermission = getContentPermission(contentType, "own");
  const readAnyPermission = getContentPermission(contentType, "readAny");
  const readPermissions = [ownPermission, readAnyPermission].filter(
    (permission): permission is string => Boolean(permission),
  );

  if (readPermissions.length > 0) {
    checkAnyPermissions(user, readPermissions);
  }

  if (
    ownPermission &&
    (!readAnyPermission || !hasPermissions(user, [readAnyPermission]))
  ) {
    Logger.addTrace("manager.list: applying own filter");
    query.filter = {
      ...query.filter,
      createdBy: user._id,
    };
  }

  if (!("_trashed" in (query.filter ?? {}))) {
    query.filter = {
      ...query.filter,
      _trashed: { $ne: true },
    };
  }

  const hasPageRoute =
    getRakunBootstrapOptions()?.routes?.some(
      (route) => route.contentType === contentType.name && route.hasPage,
    ) ?? false;

  if (hasPageRoute && !(LOCALE_VARIANT_ROLE_FIELD in (query.filter ?? {}))) {
    query.filter = {
      ...query.filter,
      [LOCALE_VARIANT_ROLE_FIELD]: { $ne: "variant" },
    };
  }

  if (
    contentType.name === "Route" ||
    contentType.name === "RouteLayoutModule" ||
    contentType.name === "RouteLayoutModuleOverride"
  ) {
    await syncConfiguredRoutes();
  }

  const raw = await db.list(contentType, query);
  Logger.addTrace("manager.list: db list success", {
    totalItems: raw.totalItems,
  });

  const items = (await Promise.all(
    raw.items.map((item) =>
      populateRelations(item, { exposePrivateMedia: true }),
    ),
  )) as {
    [x: string]: unknown;
    _id: string;
  }[];
  const resolvedItems =
    contentType.name === Media.name
      ? await Promise.all(items.map((item) => resolveMediaRecordUrls(item)))
      : items;

  return {
    totalItems: raw.totalItems,
    items: sanitizeManagerOutput(resolvedItems, contentType),
  };
};
