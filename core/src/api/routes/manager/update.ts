import { z } from "zod";
import { UpdateInput } from "../../../schemas/manager/update";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import { DbErrorInvalidData, DbErrorConflict } from "../../../orm/dbService";
import { RakunRequestContext } from "../../context";
import { getInputProxy } from "../../proxies";
import { checkOwnership } from "../../utils/checkOwnership";
import { prepareManagerUserUpdateData } from "../../utils/managerUserPassword";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";

export const updateHandler = async ({
  input,
  ctx,
}: {
  input: UpdateInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName, id } = input;
  const user = ctx.getUser();

  const contentType = requireContentType(contentTypeName);
  const data = prepareManagerUserUpdateData(
    contentType,
    input.data,
  ) as Record<string, unknown>;

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "updateAny",
  });

  const effectiveData =
    contentType.name === "Route"
      ? (() => {
          const routeData = data as Record<string, unknown>;
          const allowedKeys = Object.keys(routeData).filter(
            (key) => key !== "basePath",
          );

          if (allowedKeys.length > 0) {
            throwAppError("FORBIDDEN", {
              reason:
                "Routes defined in the API can only update their literal path from manager",
            });
          }

          return { basePath: routeData.basePath };
        })()
      : data;

  try {
    const parsedInput = contentType.partialValidate({
      ...effectiveData,
      updatedBy: user._id,
    });
    Logger.addTrace("manager.update: input validated");

    const inputProxy = getInputProxy(contentType.name);

    let proxied = parsedInput;

    if (inputProxy) {
      proxied = await inputProxy(parsedInput);
      Logger.addTrace("manager.update: input proxied");
    }

    const updated = await db.update(contentType, id, proxied, {
      actorId: user._id,
    });
    Logger.addTrace("manager.update: db update success", { id: updated._id });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: updated._id,
      operation: "update",
    });

    return sanitizeManagerOutput(updated, contentType);
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
