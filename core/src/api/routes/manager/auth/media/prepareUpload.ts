import { throwAppError } from "../../../../../lib/errors";
import {
  MediaErrorInvalidData,
  MediaErrorNotFound,
  PrepareUploadInput,
  PrepareUploadOutput,
  getMediaService,
} from "../../../../../media";
import { RakunRequestContext } from "../../../../context";
import { checkPermissions } from "../../../../utils/checkPermissions";

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

export const prepareUploadHandler = async ({
  input,
  ctx,
}: {
  input: PrepareUploadInput;
  ctx: RakunRequestContext;
}): Promise<PrepareUploadOutput> => {
  const user = ctx.getUser();

  checkPermissions(user, ["content.Media.own"]);

  try {
    const media = getMediaService();
    return await media.prepareUpload(input);
  } catch (error) {
    return mapMediaError(error);
  }
};
