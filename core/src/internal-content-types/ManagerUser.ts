import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";
import { ManagerRole } from "./ManagerRole";

export const ManagerUser = new ContentType({
  name: "ManagerUser",
  permissions: "ManagerUser",
  fields: {
    name: Fields.string().optional(),
    user: Fields.string().required(),
    email: Fields.string().type("Email").required(),
    password: Fields.string().type("Password").required().managerOnly(),
    role: Fields.relation(ManagerRole).required(),
    avatarId: Fields.string().type("Id").optional(),
    avatarKey: Fields.string().optional(),
    avatarAccess: Fields.select(["public", "private"]).optional(),
    avatarUrl: Fields.string().type("Url").optional(),
    avatarPreviewUrl: Fields.string().type("Url").optional(),
    tutorialsEnabled: Fields.boolean().optional(),
    tutorialsPromptedAt: Fields.date().type("DateTime").optional(),
    seenTours: Fields.array(Fields.string()).optional(),
    twoFactorEnabled: Fields.boolean().required(),
  },
  uniques: [["email"]],
  listFields: ["user"],
}).hideFromManager();

export type ManagerUser = typeof ManagerUser;
export type ManagerUserSchema = DataFront<ManagerUser>;
export type ManagerUserManager = DBOutput<ManagerUser>;
export type ManagerUserInput = DataInput<ManagerUser>;
