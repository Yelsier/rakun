import { Session } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { getSessionCookie } from "../../../sessionCookie";

const emptyToken = { token: "" };

export const logoutHandler = async ({ ctx }: { ctx: RakunRequestContext }) => {
  if (!ctx?.req?.cookies) return emptyToken;

  const token = getSessionCookie(ctx);

  if (!token) return emptyToken;

  const db = await getMongoService();

  await db.delete(Session, {
    token,
  });

  return emptyToken;
};
