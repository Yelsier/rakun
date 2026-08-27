import { requirePeerDependency } from "../../lib/utils/peerDependencies";
import { isBun } from "../../platform";

type Bcrypt = typeof import("bcrypt");

type BunPassword = {
  hashSync: (
    password: string,
    options: { algorithm: "bcrypt"; cost: number },
  ) => string;
  verifySync: (password: string, hash: string) => boolean;
};

type BunRuntime = typeof globalThis & {
  Bun?: {
    password?: BunPassword;
  };
};

const getBunPassword = (): BunPassword | undefined => {
  if (!isBun()) return undefined;
  return (globalThis as BunRuntime).Bun?.password;
};

const getBcrypt = () =>
  requirePeerDependency<Bcrypt>(
    "bcrypt",
    "npm install bcrypt",
    "Rakun uses bcrypt to verify and hash manager passwords.",
  );

export const verifyPassword = (password: string, hash: string) => {
  if (!isBcryptHash(hash)) return false;
  const bunPassword = getBunPassword();
  if (bunPassword) return bunPassword.verifySync(password, hash);
  return getBcrypt().compareSync(password, hash);
};

export const hashPassword = (password: string) => {
  const bunPassword = getBunPassword();
  if (bunPassword) {
    return bunPassword.hashSync(password, { algorithm: "bcrypt", cost: 10 });
  }
  return getBcrypt().hashSync(password, 10);
};

export const isBcryptHash = (value: string | undefined | null) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

export const verifyStoredPassword = (
  password: string,
  stored: string | undefined | null,
) => {
  if (!stored) {
    return {
      valid: false,
      needsRehash: false,
    };
  }

  if (isBcryptHash(stored)) {
    return {
      valid: verifyPassword(password, stored),
      needsRehash: false,
    };
  }

  const valid = password === stored;
  return {
    valid,
    needsRehash: valid,
  };
};
