import {
  Language,
  LiteralTranslation,
} from "../../../../internal-content-types";
import { Logger } from "../../../../lib/Logger";
import {
  getLiteralDefinitions,
  validateIcuVariables,
} from "../../../../literals";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  ListLiteralsInput,
  ListLiteralsOutput,
} from "../../../../schemas/manager/literals/list";
import { checkAnyPermissions } from "../../../utils/checkPermissions";

const emptyValidation = {
  isValid: true,
  missing: [],
  kindMismatch: [],
  extra: [],
};

export const listLiteralsHandler = async ({
  input,
  ctx,
}: {
  input: ListLiteralsInput;
  ctx: RakunRequestContext;
}): Promise<ListLiteralsOutput> => {
  Logger.addTrace("manager.literals.list: handler start", {
    locale: input.locale,
  });
  const user = ctx.getUser();
  checkAnyPermissions(user, ["manager.literals.readAny"]);

  Logger.addTrace("manager.literals.list: permissions checked", {
    userId: user._id,
  });

  const db = await getMongoService();
  Logger.addTrace("manager.literals.list: mongo service ready");

  const languagesResult = await db.list(Language, {
    options: { limit: "all" },
  } as never);

  const locales = (languagesResult.items || []).map((language) => ({
    code: language.code,
    name: language.name,
    default: language.default,
  }));

  const defaultLocale =
    locales.find((language) => language.default)?.code ||
    locales[0]?.code ||
    "en";

  const selectedLocale = input.locale || defaultLocale;

  const translationsResult = await db.list(LiteralTranslation, {
    filter: { locale: selectedLocale },
    options: { limit: "all" },
  } as never);

  const translationMap = new Map(
    translationsResult.items.map((item) => [item.key, item.message]),
  );

  const items = getLiteralDefinitions().map((definition) => {
    const translation = translationMap.get(definition.key);
    const validation = translation
      ? validateIcuVariables({
          source: definition.defaultMessage,
          translation,
        })
      : emptyValidation;

    return {
      key: definition.key,
      defaultMessage: definition.defaultMessage,
      description: definition.description,
      usedBy: definition.usedBy,
      variables: definition.variables,
      translation,
      hasTranslation: typeof translation === "string" && translation.length > 0,
      validation: {
        isValid: validation.isValid,
        missing: validation.missing.map((variable) => variable.name),
        kindMismatch: validation.kindMismatch.map((variable) => variable.name),
        extra: validation.extra.map((variable) => variable.name),
      },
    };
  });

  Logger.addTrace("manager.literals.list: response ready", {
    locale: selectedLocale,
    itemCount: items.length,
  });

  return {
    defaultLocale,
    selectedLocale,
    locales,
    items,
  };
};
