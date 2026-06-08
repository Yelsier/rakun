import { isAppError, throwAppError } from "../../../../lib/errors";
import { Media } from "../../../../internal-content-types";
import { hasPermissions } from "../../../../lib/Permissions";
import {
  MediaErrorInvalidData,
  MediaErrorNotFound,
  GetMediaUrlInput,
  GetMediaUrlOutput,
  getMediaService,
} from "../../../../media";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { checkAnyPermissions } from "../../../utils/checkPermissions";

const mapMediaError = (error: unknown): never => {
  if (error instanceof MediaErrorInvalidData) {
    throwAppError("VALIDATION", {
      errors: [{ message: error.message }],
    });
  }

  if (error instanceof MediaErrorNotFound) {
    throwAppError("NOT_FOUND", {
      resource: "Media",
    });
  }

  throwAppError("INTERNAL", {
    message: error instanceof Error ? error.message : "Unknown media error",
  });
};

export const getMediaUrlHandler = async ({
  input,
  ctx,
}: {
  input: GetMediaUrlInput;
  ctx: RakunRequestContext;
}): Promise<GetMediaUrlOutput> => {
  const user = ctx.getUser();

  checkAnyPermissions(user, ["content.Media.readAny", "content.Media.own"]);

  try {
    const db = await getMongoService();
    const mediaRecord = await db.find(Media, {
      key: input.key,
    });

    if (!mediaRecord) {
      throwAppError("NOT_FOUND", {
        resource: "Media",
      });
    }

    if (input.access && input.access !== mediaRecord.access) {
      throwAppError("VALIDATION", {
        errors: [{ message: "Media access does not match stored record" }],
      });
    }

    if (
      !hasPermissions(user, ["content.Media.readAny"]) &&
      mediaRecord.createdBy !== user._id
    ) {
      throwAppError("FORBIDDEN", {
        reason: "You do not have access to this media",
      });
    }

    const media = getMediaService();
    return await media.getMediaUrl({
      ...input,
      access: mediaRecord.access,
      expiresInSeconds: input.expiresInSeconds
        ? Math.min(input.expiresInSeconds, 60 * 60)
        : undefined,
    });
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }
    return mapMediaError(error);
  }
};
