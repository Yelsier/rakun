import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import {
  MediaErrorInvalidData,
  MediaErrorNotFound,
  PrepareUploadInput,
  getMediaService,
} from "../../../../media";
import type { PrepareUploadOutput } from "../../../../schemas/manager/media/prepareUpload";
import { RakunRequestContext } from "../../../context";
import { checkPermissions } from "../../../utils/checkPermissions";
import { createMediaUploadToken } from "../../../utils/mediaUploadToken";

const mapMediaError = (error: unknown): never => {
  Logger.error("manager.media.prepareUpload failed", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

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

export const prepareUploadHandler = async ({
  input,
  ctx,
}: {
  input: PrepareUploadInput;
  ctx: RakunRequestContext;
}): Promise<PrepareUploadOutput> => {
  const user = ctx.getUser();

  if (input.purpose === "profileAvatar") {
    if (!input.mime.startsWith("image/")) {
      throwAppError("VALIDATION", {
        errors: [{ message: "Profile avatars must be images." }],
      });
    }
  } else {
    checkPermissions(user, ["content.Media.own"]);
  }

  try {
    const media = getMediaService();
    Logger.addTrace("manager.media.prepareUpload: media service ready");
    const prepared = await media.prepareUpload(input);
    Logger.addTrace("manager.media.prepareUpload: prepared", {
      key: prepared.key,
      access: prepared.access,
      hasUrl: Boolean(prepared.url),
    });
    return {
      ...prepared,
      uploadToken: createMediaUploadToken({
        key: prepared.key,
        access: prepared.access,
        mime: input.mime,
        size: input.size,
        userId: user._id,
        purpose: input.purpose,
      }),
    };
  } catch (error) {
    Logger.addTrace("manager.media.prepareUpload: handler failed");
    return mapMediaError(error);
  }
};
