import type ContentType from "../lib/ContentType";
import { throwAppError } from "../lib/errors";
import { hashPassword, isBcryptHash } from "../api/utils/passwords";
import { ManagerUser } from "./ManagerUser";

const getPassword = (data: Record<string, unknown>) =>
  typeof data.password === "string" ? data.password : undefined;

const hashManagerPassword = (data: Record<string, unknown>) => {
  const password = getPassword(data);
  if (!password || isBcryptHash(password)) return data;

  return {
    ...data,
    password: hashPassword(password),
  };
};

export const applyManagerUserHooks = (
  managerUser: ContentType = ManagerUser,
) => {
  managerUser.withHooks({
    beforeInsert: ({ data }) => {
      const record = data as Record<string, unknown>;
      const password = getPassword(record);

      if (!password?.trim()) {
        throwAppError("VALIDATION", {
          errors: [{ path: ["password"], message: "Password is required" }],
        });
      }

      return hashManagerPassword(record);
    },
    beforeUpdate: ({ data, context }) => {
      const record = { ...(data as Record<string, unknown>) };
      if (
        Object.prototype.hasOwnProperty.call(record, 'twoFactorEnabled') &&
        context.requestContext &&
        context.reason !== 'mfa-state-sync'
      ) {
        throwAppError('FORBIDDEN', {
          reason: 'MFA state can only be changed by the MFA enrollment flow',
        })
      }
      const password = getPassword(record);

      if (password === undefined || password.trim() === "") {
        delete record.password;
        return record;
      }

      return hashManagerPassword(record);
    },
  });

  return managerUser;
};
