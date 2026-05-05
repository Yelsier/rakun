import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { hasPermissions, Permission } from "../../../lib/Permissions";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { RakunRequestContext } from "../../context";
import { ListInput } from "../../../schemas/manager/list";
import { checkAnyPermissions } from "../../utils/checkPermissions";
import { populateRelations } from "../../utils/populates/populateRelations";
import { syncConfiguredRoutes } from "../../utils/routes/syncConfiguredRoutes";

export const listHandler = async ({
  input,
  ctx,
}: {
  input: ListInput;
  ctx: RakunRequestContext;
}) => {
  Logger.addTrace("manager.list: handler start", {
    contentType: input.contentType,
  });
  const db = await getMongoService();
  Logger.addTrace("manager.list: mongo service ready");
  const { contentType: contentTypeName, query } = input;
  const contentType = getContentTypeByName(contentTypeName);
  const user = ctx.getUser();
  Logger.addTrace("manager.list: user resolved", { userId: user._id });

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  checkAnyPermissions(user, [
    `content.${contentTypeName}.own` as Permission,
    `content.${contentTypeName}.readAny` as Permission,
  ]);
  Logger.addTrace("manager.list: permissions checked");

  if (
    !hasPermissions(user, [`content.${contentTypeName}.readAny` as Permission])
  ) {
    Logger.addTrace("manager.list: applying own filter");
    query.filter = {
      ...query.filter,
      createdBy: user._id,
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

  return {
    totalItems: raw.totalItems,
    items: (await Promise.all(
      raw.items.map((item) => populateRelations(item)),
    )) as {
      [x: string]: unknown;
      _id: string;
    }[],
  };
};
