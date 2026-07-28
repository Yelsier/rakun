import { z } from "zod";
import { UpdateInput } from "../../../schemas/manager/update";
import { throwAppError } from "../../../lib/errors";
import { Logger } from "../../../lib/Logger";
import { getMongoService } from "../../../orm";
import { DbErrorInvalidData, DbErrorConflict } from "../../../orm/dbService";
import { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import { sanitizeManagerOutput } from "../../utils/sanitizeManagerOutput";
import {
  applyEffectiveIterator,
  getEffectiveIterator,
  getLinkedIteratorTemplate,
  isIteratorUnlinked,
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
  forbidLinkedIteratorTemplateAccess(contentType);
  const data = { ...(input.data as Record<string, unknown>) };

  await checkOwnership({
    ctx,
    contentType,
    id,
    permission: "updateAny",
  });

  const effectiveData: Record<string, unknown> =
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

          return { basePath: routeData.basePath } as Record<string, unknown>;
        })()
      : data;

  try {
    let linkedIteratorChanged = false;
    if (contentType.linkedIterator) {
      const current = await db.get(contentType, id);
      const control = input.linkedIterator;
      const mode =
        control?.mode ?? (isIteratorUnlinked(current) ? "unlinked" : "linked");
      const template = await getLinkedIteratorTemplate(db, contentType);

      delete effectiveData[ITERATOR_UNLINKED_FIELD_NAME];

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
        effectiveData[ITERATOR_UNLINKED_FIELD_NAME] = true;
        if (!(ITERATOR_FIELD_NAME in effectiveData)) {
          effectiveData[ITERATOR_FIELD_NAME] = await getEffectiveIterator({
            db,
            contentType,
            document: current,
          });
        }
      } else {
        effectiveData[ITERATOR_UNLINKED_FIELD_NAME] = null;

        if (control?.action) {
          requireLinkedIteratorUpdate(contentType, ctx);
          contentType.partialValidate({
            ...effectiveData,
            updatedBy: user._id,
          });
          const savedTemplate = await saveLinkedIteratorTemplate({
            action: control.action,
            contentType,
            db,
            expectedRevision: control.revision,
            iterator: effectiveData[ITERATOR_FIELD_NAME] ?? [],
            options: {
              actorId: user._id,
              reason: `linked iterator ${control.action}`,
            },
          });
          effectiveData[ITERATOR_FIELD_NAME] = savedTemplate.iterator;
          linkedIteratorChanged = true;
        } else if (template.iterator) {
          effectiveData[ITERATOR_FIELD_NAME] = template.iterator;
        }
      }
    } else if (input.linkedIterator) {
      throwAppError("FEATURE_UNSUPPORTED", {
        feature: "linkedIterator",
      });
    }

    const parsedInput = contentType.partialValidate({
      ...effectiveData,
      updatedBy: user._id,
    });
    Logger.addTrace("manager.update: input validated");

    const updated = await db.update(contentType, id, parsedInput, {
      actorId: user._id,
    });
    Logger.addTrace("manager.update: db update success", { id: updated._id });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: updated._id,
      operation: "update",
    });

    if (linkedIteratorChanged) {
      await revalidateContentTypePaths(contentType.name);
    }

    const effective = await applyEffectiveIterator({
      db,
      contentType,
      document: updated,
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
