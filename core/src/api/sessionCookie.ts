import { RakunRequestContext } from "./context";

export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export const setSessionCookie = (
  ctx: RakunRequestContext,
  token: string,
  options: { maxAge?: number } = {},
) => {
  const maxAge = options.maxAge ?? SESSION_MAX_AGE_MS;
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
    const cookieParts = [
      `session=${encodeURIComponent(token)}`,
      "Path=/",
      domain ? `Domain=${domain}` : null,
      "HttpOnly",
      "SameSite=Lax",
      "Secure",
      `Max-Age=${Math.max(0, Math.floor(maxAge / 1000))}`,
    ].filter(Boolean);

    ctx.res.setHeader(
      "Set-Cookie",
      cookieParts.join("; "),
    );
  }
};

export const getSessionCookie = (ctx: RakunRequestContext) => {
  const cookies = ctx.req?.cookies;
  if (!cookies) return null;

  return cookies.session || null;
};
