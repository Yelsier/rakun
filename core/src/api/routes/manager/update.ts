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
  getLocaleVariantGroupId,
  getLocaleVariantRole,
  LOCALE_VARIANT_GROUP_FIELD,
} from "../../../lib/localeVariants";
import { forbidContentTemplateAccess } from "./template";
import { isRouteableContentType } from "../../../lib/routeableContent";
import {
  getDocumentReviewPolicy,
  getRelationId,
  getReviewPolicyForRole,
} from "../../utils/reviews";
import { createSlugChangeRedirects } from "../../utils/redirects/createSlugChangeRedirects";
import { computeSlugPathChanges } from "../../utils/redirects/slugPathChanges";
import { publishLocaleVariantChanges } from '../../utils/realtime'

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
  forbidContentTemplateAccess(contentType);
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

  const routeableContentType = isRouteableContentType(contentType.name);
  const currentDocument = contentType.documentVisibility || routeableContentType
    ? ((await db.get(contentType, id)) as Record<string, unknown> & { _id: string })
    : undefined;
  const localeVariantsToRestore =
    currentDocument?._trashed === true &&
    effectiveData._trashed === false &&
    routeableContentType &&
    getLocaleVariantRole(currentDocument) === "primary"
      ? ((
          await db.list(contentType, {
            filter: {
              _trashed: true,
              [LOCALE_VARIANT_GROUP_FIELD]:
                getLocaleVariantGroupId(currentDocument),
            },
            options: { limit: "all" },
          })
        ).items as Array<
          Record<string, unknown> & {
            _id: string;
            _visibilityBeforeTrash?: string;
          }
        >)
      : [];

  for (const localeVariant of localeVariantsToRestore) {
    await checkOwnership({
      ctx,
      contentType,
      id: localeVariant._id,
      permission: "updateAny",
    });
  }

  if (
    currentDocument?._visibility === "draft" &&
    effectiveData._visibility === "published" &&
    (await getDocumentReviewPolicy({ contentType, document: currentDocument }))
  ) {
    throwAppError("FORBIDDEN", {
      reason: "Publish this draft through the approved review promotion workflow",
    });
  }

  const actorRoleId = getRelationId(user.role);
  const workflowMetadata = new Set([
    "_visibility",
    "_trashed",
    "_visibilityBeforeTrash",
  ]);
  const changesContent = Object.keys(effectiveData).some(
    (key) => !workflowMetadata.has(key),
  );
  if (
    currentDocument?._visibility === "published" &&
    changesContent &&
    routeableContentType &&
    actorRoleId &&
    (await getReviewPolicyForRole({
      contentType: contentType.name,
      roleId: actorRoleId,
    }))
  ) {
    throwAppError("CONFLICT", {
      key: "DRAFT_VERSION_REQUIRED",
      message: "Create a draft version before editing this published document",
    });
  }

  try {
    const parsedInput = contentType.partialValidate({
      ...effectiveData,
      updatedBy: user._id,
    });
    Logger.addTrace("manager.update: input validated");

    const updated = await db.update(contentType, id, parsedInput, {
      actorId: user._id,
    });
    await Promise.all(
      localeVariantsToRestore.map((localeVariant) => {
        const visibilityBeforeTrash = localeVariant._visibilityBeforeTrash;
        return db.update(
          contentType,
          localeVariant._id,
          {
            _trashed: false,
            ...(contentType.documentVisibility
              ? {
                  _visibility:
                    visibilityBeforeTrash === "draft" ||
                    visibilityBeforeTrash === "hidden" ||
                    visibilityBeforeTrash === "published"
                      ? visibilityBeforeTrash
                      : "published",
                }
              : {}),
          },
          {
            actorId: user._id,
            reason: "restore locale variant group from trash",
          },
        );
      }),
    );
    Logger.addTrace("manager.update: db update success", { id: updated._id });

    // Capture path diffs before route maps are rebuilt by revalidation.
    const pathChanges = await computeSlugPathChanges({
      contentType: contentType.name,
      documentId: updated._id,
    });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: updated._id,
      operation: "update",
    });

    if (pathChanges.length > 0) {
      await createSlugChangeRedirects({
        changes: pathChanges,
        user,
        sourceContentType: contentType.name,
        sourceDocumentId: updated._id,
      });
    }

    if (routeableContentType) {
      publishLocaleVariantChanges(contentType.name)
    }

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
