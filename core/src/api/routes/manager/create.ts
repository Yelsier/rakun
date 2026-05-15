import { z } from "zod";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getContentTypeByName } from "../../../lib/Registry";
import { getMongoService } from "../../../orm";
import { DbErrorInvalidData, DbErrorConflict } from "../../../orm/dbService";
import { RakunRequestContext } from "../../context";
import { CreateInput } from "../../../schemas/manager/create";
import { checkPermissions } from "../../utils/checkPermissions";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { Permission } from "../../../lib/Permissions";
import { getInputProxy } from "../../proxies";

export const createHandler = async ({
  input,
  ctx,
}: {
  input: CreateInput;
  ctx: RakunRequestContext;
}) => {
  Logger.addTrace("manager.create: handler start", {
    contentType: input.contentType,
  });
  const db = await getMongoService();
  const { contentType: contentTypeName, data } = input;
  const user = ctx.getUser();
  Logger.addTrace("manager.create: user resolved", { userId: user._id });

  const contentType = getContentTypeByName(contentTypeName);

  if (!contentType) {
    throwAppError("NOT_FOUND", {
      resource: "ContentType",
      id: contentTypeName,
    });
  }

  checkPermissions(user, [`content.${contentTypeName}.own` as Permission]);
  Logger.addTrace("manager.create: permissions checked");

  if (contentType.name === "Route") {
    throwAppError("FORBIDDEN", {
      reason:
        "Routes are defined in the API and cannot be created from manager",
    });
  }

  try {
    const parsedInput = contentType.validate({
      ...data,
      createdBy: user._id,
      updatedBy: user._id,
    });
    Logger.addTrace("manager.create: input validated");

    const inputProxy = getInputProxy(contentType.name);

    let proxied = parsedInput;

    if (inputProxy) {
      proxied = await inputProxy(parsedInput);
      Logger.addTrace("manager.create: input proxied");
    }

    const created = await db.create(contentType, proxied, {
      actorId: user._id,
    });
    Logger.addTrace("manager.create: db create success", { id: created._id });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: created._id,
      operation: "create",
    });
    Logger.addTrace("manager.create: revalidate done");

    return created;
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof DbErrorInvalidData) {
      throwAppError("VALIDATION", {
        errors: error.issues,
      });
    }
    if (error instanceof DbErrorConflict) {
      throwAppError("CONFLICT", {
        message: error.message,
        key: error.details as string,
      });
    }

    throw error;
  }
};
