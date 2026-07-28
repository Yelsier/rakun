import { Language } from "../../../internal-content-types";
import { throwAppError } from "../../../lib/errors";
import { getMongoService } from "../../../orm";
import type { RakunRequestContext } from "../../context";
import type { SetDefaultLanguageInput } from "../../../schemas/manager/setDefaultLanguage";
import { checkPermissions } from "../../utils/checkPermissions";
import { regenerateAllRoutesMap } from "../../utils/routes/updateRoutesMap";

export const setDefaultLanguageHandler = async ({
  input,
  ctx,
}: {
  input: SetDefaultLanguageInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const { language: languageCode } = input;
  const user = ctx.getUser();
  const language = await db.find(Language, { code: languageCode });

  checkPermissions(user, ["content.Language.updateAny"]);

  if (!language) {
    throwAppError("NOT_FOUND", {
      resource: "Language",
      id: languageCode,
    });
  }

  // First, unset the current default language
  const currentDefault = await db.find(Language, { default: true });
  const defaultChanged =
    !currentDefault || String(currentDefault._id) !== String(language._id);

  if (currentDefault && String(currentDefault._id) !== String(language._id)) {
    await db.update(Language, currentDefault._id, { default: false });
  }
  // Then, set the new default language
  await db.update(Language, language._id, { default: true });
  if (defaultChanged) {
    await regenerateAllRoutesMap();
  }

  return { ok: true };
};
