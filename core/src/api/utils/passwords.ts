import { requirePeerDependency } from "../../lib/utils/peerDependencies";

type Bcrypt = typeof import("bcrypt");

const getBcrypt = () =>
  requirePeerDependency<Bcrypt>(
    "bcrypt",
    "npm install bcrypt",
    "Rakun uses bcrypt to verify and hash manager passwords.",
  );

export const verifyPassword = (password: string, hash: string) => {
  if (!isBcryptHash(hash)) return false;
  return getBcrypt().compareSync(password, hash);
};

export const hashPassword = (password: string) => {
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
