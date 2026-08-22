import { z } from "zod";

import { Logger } from "../../../lib/Logger";
import { throwAppError } from "../../../lib/errors";
import { DbErrorInvalidData } from "../../../orm/dbService";
import { getMongoService } from "../../../orm";
import {
  createDocumentTranslationPatch,
  getTranslationService,
  hasTranslationService,
} from "../../../translation";
import type {
  TranslateDocumentInput,
  TranslateDocumentOutput,
} from "../../../schemas/manager/translateDocument";
import type { RakunRequestContext } from "../../context";
import { checkOwnership } from "../../utils/checkOwnership";
import { getLanguages } from "../../utils/getLanguages";
import { requireContentType } from "../../utils/requireContentType";
import { isRouteableContentType } from "../../../lib/routeableContent";
import {
  getRelationId,
  getReviewPolicyForRole,
} from "../../utils/reviews";

const unique = <T>(values: T[]) => Array.from(new Set(values));

const normalizeRouteData = (data: unknown) => {
  if (!data || typeof data !== "object") return data;

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
};

export const translateDocumentHandler = async ({
  input,
  ctx,
}: {
  input: TranslateDocumentInput;
  ctx: RakunRequestContext;
}): Promise<TranslateDocumentOutput> => {
  if (!hasTranslationService()) {
    throwAppError("FEATURE_UNSUPPORTED", {
      feature: "translation",
      message: "Translation service is not configured",
    });
  }

  const db = await getMongoService();
  const user = ctx.getUser();
  const contentType = requireContentType(input.contentType);

  await checkOwnership({
    ctx,
    contentType,
    id: input.id,
    permission: "updateAny",
  });

  const languages = await getLanguages();
  const from = languages.find((language) => language.code === input.from);
  const to = unique(input.to)
    .filter((code) => code !== input.from)
    .map((code) => languages.find((language) => language.code === code));

  if (!from || to.some((language) => !language)) {
    throwAppError("VALIDATION", {
      errors: "Unknown translation language",
    });
  }

  const targetLanguages = to.filter(
    (language): language is NonNullable<typeof language> => Boolean(language),
  );
  const storedCurrent = await db.get(contentType, input.id);
  const actorRoleId = getRelationId(user.role);
  if (
    storedCurrent._visibility === "published" &&
    isRouteableContentType(contentType.name) &&
    actorRoleId &&
    (await getReviewPolicyForRole({
      contentType: contentType.name,
      roleId: actorRoleId,
    }))
  ) {
    throwAppError("CONFLICT", {
      key: "DRAFT_VERSION_REQUIRED",
      message: "Create a draft version before translating this published document",
    });
  }
  const current = storedCurrent;
  const effectiveInputData =
    contentType.name === "Route" ? normalizeRouteData(input.data) : input.data;

  try {
    const parsedData =
      effectiveInputData === undefined
        ? undefined
        : contentType.partialValidate(effectiveInputData);
    const document = {
      ...current,
      ...(parsedData as Record<string, unknown> | undefined),
    };
    const service = getTranslationService();
    const { patch, summary } = await createDocumentTranslationPatch({
      contentType,
      document,
      from,
      to: targetLanguages,
      overwrite: input.overwrite,
      service,
    });
    const data: Record<string, unknown> = {
      ...(parsedData as Record<string, unknown> | undefined),
      ...patch,
    };
    if (Object.keys(data).length === 0) return { item: current, summary };

    const parsedUpdate = contentType.partialValidate(data);
    Logger.addTrace("manager.translateDocument: input validated");

    Logger.addTrace("manager.translateDocument: working snapshot translated", {
      id: input.id,
      translatedSegments: summary.translatedSegments,
    });
    return {
      item: { ...current, ...parsedUpdate },
      summary,
    };
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof DbErrorInvalidData) {
      throwAppError("VALIDATION", {
        errors: error.issues,
      });
    }

    throw error;
  }
};
