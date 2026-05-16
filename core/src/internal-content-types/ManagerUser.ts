import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DataFront, DataInput, DBOutput } from "../lib/types";
import { ManagerRole } from "./ManagerRole";

export const ManagerUser = new ContentType({
  name: "ManagerUser",
  fields: {
    user: Fields.string().required(),
    email: Fields.string().type("Email").required(),
    password: Fields.string().type("Password").required().managerOnly(),
    role: Fields.relation(ManagerRole).required(),
    avatarId: Fields.string().type("Id"),
    avatarKey: Fields.string(),
    avatarAccess: Fields.select(["public", "private"]),
    avatarUrl: Fields.string().type("Url"),
    avatarPreviewUrl: Fields.string().type("Url"),
    twoFactorEnabled: Fields.boolean().required(),
  },
  uniques: [["email"]],
  listFields: ["user"],
}).hideFromManager();

export type ManagerUser = typeof ManagerUser;
export type ManagerUserSchema = DataFront<ManagerUser>;
export type ManagerUserManager = DBOutput<ManagerUser>;
export type ManagerUserInput = DataInput<ManagerUser>;
