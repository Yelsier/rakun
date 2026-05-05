import { Session, UserMfa } from "../../../../internal-content-types";
import { getMongoService } from "../../../../orm";
import { RakunRequestContext } from "../../../context";
import { getSessionCookie } from "../../../sessionCookie";
import { AccountInfoOutput } from "../../../../schemas/manager/auth/accountInfo";

export const accountInfoHandler = async ({
  ctx,
}: {
  ctx: RakunRequestContext;
}): Promise<AccountInfoOutput> => {
  const user = ctx.getUser();
  const db = await getMongoService();

  const sessions = (
    await db.list(Session, {
      filter: { "user._id": user._id },
      options: {
        limit: "all",
        fields: ["token", "createdAt", "expiresAt"],
      },
    })
  ).items;

  const mfa = await db.find(UserMfa, { "user._id": user._id }, [
    "enabled",
    "preferredMethod",
  ]);

  return {
    sessions,
    has2FA: !!mfa,
    enabled2FA: mfa?.enabled ?? false,
    method2FA: mfa?.preferredMethod ?? "totp",
    currentSession: getSessionCookie(ctx) as string,
  };
};
