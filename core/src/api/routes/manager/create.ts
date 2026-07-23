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
import {
  applyEffectiveIterator,
  getLinkedIteratorTemplate,
  saveLinkedIteratorTemplate,
} from "../../utils/linkedIterator";
import {
  ITERATOR_FIELD_NAME,
  ITERATOR_UNLINKED_FIELD_NAME,
} from "../../../lib/systemFields";
import {
  forbidLinkedIteratorTemplateAccess,
  requireLinkedIteratorUpdate,
} from "./linkedIterator";
import { revalidateContentTypePaths } from "../../utils/routes/revalidatePath";

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
  forbidLinkedIteratorTemplateAccess(contentType);
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
    let initializeLinkedIterator = false;
    if (contentType.linkedIterator) {
      const control = input.linkedIterator;
      const mode = control?.mode ?? "linked";
      const template = await getLinkedIteratorTemplate(db, contentType);

      delete data[ITERATOR_UNLINKED_FIELD_NAME];

      if (mode === "unlinked") {
        if (control?.action) {
          throwAppError("VALIDATION", {
            errors: [
              {
                path: ["linkedIterator", "action"],
                message:
                  "A local iterator cannot initialize or update the shared template",
              },
            ],
          });
        }
        data[ITERATOR_UNLINKED_FIELD_NAME] = true;
      } else if (template.iterator) {
        if (control?.action) {
          throwAppError("CONFLICT", {
            message:
              "The linked iterator was initialized before this document was saved",
            key: "LINKED_ITERATOR_ALREADY_INITIALIZED",
          });
        }
        data[ITERATOR_FIELD_NAME] = template.iterator;
      } else {
        const existing = await db.list(contentType, {
          options: { fields: ["_id"], limit: 1 },
        });
        initializeLinkedIterator =
          control?.action === "initialize" || existing.totalItems === 0;

        if (control?.action === "update") {
          throwAppError("VALIDATION", {
            errors: [
              {
                path: ["linkedIterator", "action"],
                message:
                  "A linked iterator cannot be updated before initialization",
              },
            ],
          });
        }

        if (control?.action === "initialize" && existing.totalItems > 0) {
          requireLinkedIteratorUpdate(contentType, ctx);
        }
      }
    } else if (input.linkedIterator) {
      throwAppError("FEATURE_UNSUPPORTED", {
        feature: "linkedIterator",
      });
    }

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

    if (initializeLinkedIterator) {
      await saveLinkedIteratorTemplate({
        action: "initialize",
        contentType,
        db,
        iterator: data[ITERATOR_FIELD_NAME] ?? [],
        options: {
          actorId: user._id,
          reason: "linked iterator initialization",
        },
      });
      await revalidateContentTypePaths(contentType.name);
    }

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: created._id,
      operation: "create",
    });

    const effective = await applyEffectiveIterator({
      db,
      contentType,
      document: created,
    });
    return sanitizeManagerOutput(effective, contentType);
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
