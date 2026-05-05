import { ManagerUser } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { UpdatePasswordInput } from "../../../../schemas/manager/updatePassword";
import { verifyPassword, hashPassword } from "../../../utils/passwords";

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

  if (!verifyPassword(input.currentPassword, password)) {
    throw new Error("Current password is incorrect");
  }

  await db.update(ManagerUser, user._id, {
    password: hashPassword(input.newPassword),
  });

  return { ok: true };
};
