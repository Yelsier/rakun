import { RakunRequestContext } from "../context";
import { getSessionCookie } from "../sessionCookie";
import { ManagerUser, Session } from "../../internal-content-types";
import { getMongoService } from "../../orm";
import { populateRelations } from "./populates/populateRelations";

export const getUser = async (ctx: RakunRequestContext) => {
  const token = getSessionCookie(ctx);
  if (!token) return null;

  const db = await getMongoService();

  const session = await db.find(Session, {
    token,
  });

  if (!session) return null;

  const user = await db.find(ManagerUser, { _id: session.user._id });

  if (!user) return null;

  return await populateRelations<ManagerUser>(user);
};
