import { requirePeerDependency } from "../../lib/utils/peerDependencies";

type Bcrypt = typeof import("bcrypt");

const getBcrypt = () =>
  requirePeerDependency<Bcrypt>(
    "bcrypt",
    "npm install bcrypt",
    "Rakun uses bcrypt to verify and hash manager passwords.",
  );

export const verifyPassword = (password: string, hash: string) => {
  return getBcrypt().compareSync(password, hash);
};

export const hashPassword = (password: string) => {
  return getBcrypt().hashSync(password, 10);
};
