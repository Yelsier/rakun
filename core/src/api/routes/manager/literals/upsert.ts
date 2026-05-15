import { LiteralTranslation } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import {
  getLiteralDefinition,
  validateIcuVariables,
} from "../../../../literals";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import {
  UpsertLiteralInput,
  UpsertLiteralOutput,
} from "../../../../schemas/manager/literals/upsert";
import { checkPermissions } from "../../../utils/checkPermissions";

export const upsertLiteralHandler = async ({
  input,
  ctx,
}: {
  input: UpsertLiteralInput;
  ctx: RakunRequestContext;
}): Promise<UpsertLiteralOutput> => {
  Logger.addTrace("manager.literals.upsert: handler start", {
    key: input.key,
    locale: input.locale,
  });

  const user = ctx.getUser();

  checkPermissions(user, ["manager.literals.updateAny"]);

  Logger.addTrace("manager.literals.upsert: permissions checked", {
    userId: user._id,
  });

  const literalDefinition = getLiteralDefinition(input.key);
  if (!literalDefinition) {
    throwAppError("NOT_FOUND", {
      resource: "LiteralDefinition",
      id: input.key,
    });
  }

  const validation = validateIcuVariables({
    source: literalDefinition.defaultMessage,
    translation: input.message,
  });

  if (!validation.isValid) {
    throwAppError("VALIDATION", {
      errors: [
        ...(validation.missing.length > 0
          ? [
              {
                message: `Missing ICU variables: ${validation.missing
                  .map((variable) => variable.name)
                  .join(", ")}`,
              },
            ]
          : []),
        ...(validation.kindMismatch.length > 0
          ? [
              {
                message: `ICU variable kind mismatch: ${validation.kindMismatch
                  .map(
                    (variable) =>
                      `${variable.name} (expected ${variable.kind})`,
                  )
                  .join(", ")}`,
              },
            ]
          : []),
      ],
    });
  }

  const db = await getMongoService();

  await db.upsert(
    LiteralTranslation,
    {
      key: input.key,
      locale: input.locale,
    },
    {
      _type: "LiteralTranslation",
      key: input.key,
      locale: input.locale,
      message: input.message,
      updatedBy: user._id,
      createdBy: user._id,
    },
  );

  Logger.addTrace("manager.literals.upsert: translation upserted");

  return {
    ok: true,
    key: input.key,
    locale: input.locale,
    message: input.message,
    validation: {
      isValid: true,
      missing: [],
      kindMismatch: [],
      extra: validation.extra.map((variable) => variable.name),
    },
  };
};
