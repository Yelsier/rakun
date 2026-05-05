import { Session } from "../../../../internal-content-types";
import { throwAppError } from "../../../../lib/errors";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { DeleteSessionInput } from "../../../../schemas/manager/auth/deleteSession";

export const deleteSessionHandler = async ({
  input,
  ctx,
}: {
  input: DeleteSessionInput;
  ctx: RakunRequestContext;
}) => {
  const user = ctx.getUser();

  const db = await getMongoService();

  const session = await db.find(Session, {
    token: input.token,
    "user._id": user._id,
  });

  if (!session) {
    throwAppError("NOT_FOUND", {
      id: input.token,
      resource: "Session",
    });
  }

  await db.delete(Session, {
    token: input.token,
  });

  return { ok: true };
};
