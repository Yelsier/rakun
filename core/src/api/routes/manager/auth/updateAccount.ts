import { ManagerUser, Media } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import {
  UpdateAccountInput,
} from "../../../../schemas/manager/auth/accountInfo";
import { RakunRequestContext } from "../../../context";
import { populateRelations } from "../../../utils/populates/populateRelations";

export const updateAccountHandler = async ({
  input,
  ctx,
}: {
  input: UpdateAccountInput;
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();
  const db = await getMongoService();
  const avatar =
    input.avatarId && input.avatarId !== user.avatarId
      ? await db.get(Media, input.avatarId)
      : undefined;

  const updated = await db.update(ManagerUser, user._id, {
    user: input.user.trim(),
    avatarId: avatar?._id ?? user.avatarId,
    avatarKey: avatar?.key ?? user.avatarKey,
    avatarAccess: avatar?.access ?? user.avatarAccess,
    avatarUrl: avatar?.url ?? user.avatarUrl,
    avatarPreviewUrl: avatar?.previewUrl ?? user.avatarPreviewUrl,
  });

  return await populateRelations<ManagerUser>(updated, {
    exposePrivateMedia: true,
  });
};
