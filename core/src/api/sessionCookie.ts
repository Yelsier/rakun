import { RakunRequestContext } from "./context";

export const setSessionCookie = (
  ctx: RakunRequestContext,
  token: string,
  options: { maxAge?: number } = {},
) => {
  const maxAge = options.maxAge ?? 1000 * 60 * 60 * 24 * 7;
  const domain = process.env.BASE_DOMAIN;
  if (ctx.res?.cookie) {
    ctx.res.cookie("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: true,
      domain,
    });
    return;
  }

  if (ctx.res?.setHeader) {
    ctx.res.setHeader(
      "Set-Cookie",
      `session=${token}; Path=/; Domain=${domain}; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor(maxAge / 1000)}`,
    );
  }
};

export const getSessionCookie = (ctx: RakunRequestContext) => {
  const cookies = ctx.req?.cookies;
  if (!cookies) return null;

  return cookies.session || null;
};
