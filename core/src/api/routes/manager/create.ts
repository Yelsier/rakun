import { z } from "zod";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import { DbErrorInvalidData, DbErrorConflict } from "../../../orm/dbService";
import { RakunRequestContext } from "../../context";
import { CreateInput } from "../../../schemas/manager/create";
import { checkPermissions } from "../../utils/checkPermissions";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { getContentPermission } from "../../../lib/Permissions";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";
import { forbidContentTemplateAccess } from "./template";
import { initializePrimaryLocaleVariantAssignments } from "../../utils/localeVariants";

export const createHandler = async ({
  input,
  ctx,
}: {
  input: CreateInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { contentType: contentTypeName } = input;
  const user = ctx.getUser();

  const contentType = requireContentType(contentTypeName);
  forbidContentTemplateAccess(contentType);
  const data = { ...(input.data as Record<string, unknown>) };

  const createPermission = getContentPermission(contentType, "own");

  if (createPermission) {
    checkPermissions(user, [createPermission]);
  }

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

    const created = await db.create(contentType, parsedInput, {
      actorId: user._id,
    });
    Logger.addTrace("manager.create: db create success", { id: created._id });

    await initializePrimaryLocaleVariantAssignments({
      contentType,
      document: created,
    });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: created._id,
      operation: "create",
    });

    return sanitizeManagerOutput(created, contentType);
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
