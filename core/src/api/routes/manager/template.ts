import { z } from "zod";

import { ContentTemplate, TemplateContent } from "../../../internal-content-types";
import type ContentType from "../../../lib/ContentType";
import { throwAppError } from "../../../lib/errors";
import { getContentPermission, hasPermissions } from "../../../lib/Permissions";
import type {
  TemplateGetInput,
  TemplateStateOutput,
  TemplateUpdateInput,
} from "../../../schemas/manager/template";
import { getMongoService } from "../../../orm";
import { DbErrorConflict } from "../../../orm/dbService";
import type { RakunRequestContext } from "../../context";
import {
  ContentTemplateValidationError,
  createTemplateContentSlot,
  getContentTemplate,
  saveContentTemplate,
} from "../../utils/contentTemplate";
import { checkPermissions } from "../../utils/checkPermissions";
import { checkOwnership } from "../../utils/checkOwnership";
import { requireContentType } from "../../utils/requireContentType";
import { revalidateContentTypePaths } from "../../utils/routes/revalidatePath";

export const forbidContentTemplateAccess = (contentType: ContentType) => {
  if (
    contentType.name === ContentTemplate.name ||
    contentType.name === TemplateContent.name
  ) {
    throwAppError("FORBIDDEN", {
      reason: "Content templates can only be changed through template operations",
    });
  }
};

const canUpdateTemplate = (
  contentType: ContentType,
  ctx: RakunRequestContext,
) => {
  const permission = getContentPermission(contentType, "updateAny");
  return !permission || hasPermissions(ctx.getUser(), [permission]);
};

export const requireTemplateUpdate = (
  contentType: ContentType,
  ctx: RakunRequestContext,
) => {
  const permission = getContentPermission(contentType, "updateAny");
  if (permission) checkPermissions(ctx.getUser(), [permission]);
};

export const templateGetHandler = async ({
  input,
  ctx,
}: {
  input: TemplateGetInput;
  ctx: RakunRequestContext;
}): Promise<TemplateStateOutput> => {
  const contentType = requireContentType(input.contentType);
  if (!contentType.hasTemplate) {
    return {
      enabled: false,
      configured: false,
      modules: [],
      canUpdate: false,
    };
  }

  if (input.documentId) {
    await checkOwnership({
      ctx,
      contentType,
      id: input.documentId,
      permission: "readAny",
    });
  } else {
    const createPermission = getContentPermission(contentType, "own");
    if (createPermission) checkPermissions(ctx.getUser(), [createPermission]);
  }

  const template = await getContentTemplate(await getMongoService(), contentType);
  return {
    enabled: true,
    configured: template.configured,
    modules: template.modules ?? [createTemplateContentSlot()],
    revision: template.revision,
    canUpdate: canUpdateTemplate(contentType, ctx),
  };
};

export const templateUpdateHandler = async ({
  input,
  ctx,
}: {
  input: TemplateUpdateInput;
  ctx: RakunRequestContext;
}): Promise<TemplateStateOutput> => {
  const contentType = requireContentType(input.contentType);
  if (!contentType.hasTemplate) {
    throwAppError("FEATURE_UNSUPPORTED", { feature: "template" });
  }

  requireTemplateUpdate(contentType, ctx);

  try {
    const saved = await saveContentTemplate({
      contentType,
      db: await getMongoService(),
      expectedRevision: input.revision,
      modules: input.modules,
      options: {
        actorId: ctx.getUser()._id,
        reason: "content template update",
      },
    });
    await revalidateContentTypePaths(contentType.name);

    return {
      enabled: true,
      configured: true,
      modules: saved.modules ?? [],
      revision: saved.revision,
      canUpdate: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throwAppError("VALIDATION", { errors: error.issues });
    }
    if (error instanceof ContentTemplateValidationError) {
      throwAppError("VALIDATION", {
        errors: [{ path: ["modules"], message: error.message }],
      });
    }
    if (error instanceof DbErrorConflict) {
      throwAppError("CONFLICT", {
        message: error.message,
        key: "CONTENT_TEMPLATE_REVISION_CONFLICT",
      });
    }
    throw error;
  }
};
