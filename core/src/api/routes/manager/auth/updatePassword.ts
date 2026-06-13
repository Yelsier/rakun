import { ManagerUser, Session } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { getSessionCookie } from "../../../sessionCookie";
import { UpdatePasswordInput } from "../../../../schemas/manager/updatePassword";
import { verifyStoredPassword } from "../../../utils/passwords";

export const updatePasswordHandler = async ({
  input,
  ctx,
}: {
  input: UpdatePasswordInput;
  ctx: RakunRequestContext;
}) => {
  const db = await getMongoService();
  const user = ctx.getUser();
  const password = (await db.get(ManagerUser, user._id, ["password"])).password;

  if (!verifyStoredPassword(input.currentPassword, password).valid) {
    throwAppError("FORBIDDEN", {
      reason: "INVALID_CREDENTIALS",
    });
  }

  await db.update(ManagerUser, user._id, {
    password: input.newPassword,
  });
  await db.delete(Session, {
    "user._id": user._id,
    ...(getSessionCookie(ctx)
      ? { token: { $ne: getSessionCookie(ctx) } }
      : {}),
  } as never);

  return { ok: true };
};
