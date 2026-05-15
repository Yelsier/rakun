import { throwAppError } from "../../../../lib/errors";
import { Logger } from "../../../../lib/Logger";
import {
  MediaErrorInvalidData,
  MediaErrorNotFound,
  PrepareUploadInput,
  PrepareUploadOutput,
  getMediaService,
} from "../../../../media";
import { RakunRequestContext } from "../../../context";
import { checkPermissions } from "../../../utils/checkPermissions";

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
  Logger.addTrace("manager.media.prepareUpload: handler start", {
    fileName: input.fileName,
    mime: input.mime,
    size: input.size,
    access: input.access,
    folder: input.folder,
    hasKey: Boolean(input.key),
  });
  const user = ctx.getUser();

  checkPermissions(user, ["content.Media.own"]);
  Logger.addTrace("manager.media.prepareUpload: permissions checked");

  try {
    const media = getMediaService();
    Logger.addTrace("manager.media.prepareUpload: media service ready");
    const prepared = await media.prepareUpload(input);
    Logger.addTrace("manager.media.prepareUpload: prepared", {
      key: prepared.key,
      access: prepared.access,
      hasUrl: Boolean(prepared.url),
    });
    return prepared;
  } catch (error) {
    Logger.addTrace("manager.media.prepareUpload: handler failed");
    return mapMediaError(error);
  }
};
