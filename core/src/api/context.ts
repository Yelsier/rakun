import { ManagerUserSchema } from "../internal-content-types";
import { throwAppError } from "../lib/errors";
import { getUser } from "./utils/getUser";

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
};

export type RakunRequestContext = {
  req?: {
    headers?: Record<string, string | string[] | undefined>;
    cookies?: Record<string, string>;
  };
  res?: {
    setHeader: (name: string, value: string | string[]) => void;
    cookie?: (name: string, value: string, options?: CookieOptions) => void;
  };
  user?: ManagerUserSchema | null;
  getUser: () => ManagerUserSchema;
};

export type RakunRequestContextInput = {
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  res: {
    setHeader: (name: string, value: string | string[]) => void;
    cookie?: (name: string, value: string, options?: CookieOptions) => void;
  };
};

export const createRequestContext = async (
  input: RakunRequestContextInput,
): Promise<RakunRequestContext> => {
  const ctx: RakunRequestContext = {
    req: {
      headers: input.headers,
      cookies: input.cookies ?? {},
    },
    res: input.res,
    getUser() {
      return {} as ManagerUserSchema;
    },
  };

  const user = await getUser(ctx);

  return {
    ...ctx,
    user,
    getUser() {
      if (!user) {
        throwAppError("AUTH_REQUIRED");
      }

      return user;
    },
  };
};
