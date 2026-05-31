import { Logger } from "../../../lib/Logger";
import { hasPermissions, Permission } from "../../../lib/Permissions";
import { Media } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { ListInput } from "../../../schemas/manager/list";
import { checkAnyPermissions } from "../../utils/checkPermissions";
import { populateRelations } from "../../utils/populates/populateRelations";
import { requireContentType } from "../../utils/requireContentType";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";
import { resolveMediaRecordUrls } from "./media/resolveMediaRecordUrls";

export const listHandler = async ({
  input,
  ctx,
}: {
  input: ListInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, query } = input;
  const contentType = requireContentType(contentTypeName);
  const user = ctx.getUser();

  checkAnyPermissions(user, [
    `content.${contentTypeName}.own` as Permission,
    `content.${contentTypeName}.readAny` as Permission,
  ]);

  if (
    !hasPermissions(user, [`content.${contentTypeName}.readAny` as Permission])
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
    raw.items.map((item) => populateRelations(item)),
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
    items: resolvedItems,
  };
};
