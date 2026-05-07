import { throwAppError } from "../../../../lib/errors";
import {
  MediaErrorInvalidData,
  MediaErrorNotFound,
  GetMediaUrlInput,
  GetMediaUrlOutput,
  getMediaService,
} from "../../../../media";
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
    const media = getMediaService();
    return await media.getMediaUrl(input);
  } catch (error) {
    return mapMediaError(error);
  }
};
