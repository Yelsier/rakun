import { z } from "zod";

import { Logger } from "../../../lib/Logger";
import { throwAppError } from "../../../lib/errors";
import { DbErrorConflict, DbErrorInvalidData } from "../../../orm/dbService";
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
import { checkRevalidatePath } from "../../utils/routes/revalidatePath";
import {
  applyEffectiveIterator,
  getLinkedIteratorTemplate,
  isIteratorUnlinked,
  saveLinkedIteratorTemplate,
} from "../../utils/linkedIterator";
import { ITERATOR_FIELD_NAME } from "../../../lib/systemFields";
import {
  canUpdateLinkedIterator,
  requireLinkedIteratorUpdate,
} from "./linkedIterator";
import { revalidateContentTypePaths } from "../../utils/routes/revalidatePath";

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
  const current = await applyEffectiveIterator({
    db,
    contentType,
    document: storedCurrent,
  });
  const canTranslateSharedIterator =
    contentType.linkedIterator &&
    !isIteratorUnlinked(storedCurrent) &&
    canUpdateLinkedIterator(contentType, ctx);
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
    if (
      contentType.linkedIterator &&
      !isIteratorUnlinked(storedCurrent) &&
      !canTranslateSharedIterator
    ) {
      delete document[ITERATOR_FIELD_NAME];
    }
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
      updatedBy: user._id,
    };
    let linkedIteratorChanged = false;
    if (
      canTranslateSharedIterator &&
      ITERATOR_FIELD_NAME in patch
    ) {
      requireLinkedIteratorUpdate(contentType, ctx);
      const template = await getLinkedIteratorTemplate(db, contentType);
      if (template.configured) {
        await saveLinkedIteratorTemplate({
          action: "update",
          contentType,
          db,
          expectedRevision: template.revision,
          iterator: data[ITERATOR_FIELD_NAME],
          options: {
            actorId: user._id,
            reason: "linked iterator translation",
          },
        });
        linkedIteratorChanged = true;
      }
    }

    if (Object.keys(data).length === 1 && "updatedBy" in data) {
      return { item: current, summary };
    }

    const parsedUpdate = contentType.partialValidate(data);
    Logger.addTrace("manager.translateDocument: input validated");

    const updated = await db.update(contentType, input.id, parsedUpdate, {
      actorId: user._id,
      reason: "manager translate",
    });
    Logger.addTrace("manager.translateDocument: db update success", {
      id: updated._id,
      translatedSegments: summary.translatedSegments,
    });

    await checkRevalidatePath({
      contentType: contentType.name,
      contentTypeId: updated._id,
      operation: "update",
    });
    if (linkedIteratorChanged) {
      await revalidateContentTypePaths(contentType.name);
    }

    return {
      item: await applyEffectiveIterator({
        db,
        contentType,
        document: updated,
      }),
      summary,
    };
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
