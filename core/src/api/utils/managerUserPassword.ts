import { ManagerUser } from "../../internal-content-types";
import { throwAppError } from "../../lib/errors";
import type ContentType from "../../lib/ContentType";
import { hashPassword } from "./passwords";

const getRecordCopy = (data: unknown): Record<string, unknown> => ({
  ...((data ?? {}) as Record<string, unknown>),
});

const getPassword = (data: Record<string, unknown>) =>
  typeof data.password === "string" ? data.password : undefined;

export const prepareManagerUserCreateData = (
  contentType: ContentType,
  data: unknown,
) => {
  if (contentType.name !== ManagerUser.name) return data;

  const next = getRecordCopy(data);
  const password = getPassword(next);

  if (!password?.trim()) {
    throwAppError("VALIDATION", {
      errors: [{ path: ["password"], message: "Password is required" }],
    });
  }

  next.password = hashPassword(password);
  return next;
};

export const prepareManagerUserUpdateData = (
  contentType: ContentType,
  data: unknown,
) => {
  if (contentType.name !== ManagerUser.name) return data;

  const next = getRecordCopy(data);
  const password = getPassword(next);

  if (password === undefined || password.trim() === "") {
    delete next.password;
    return next;
  }

  next.password = hashPassword(password);
  return next;
};

