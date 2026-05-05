import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import { PermissionsList } from "../lib/Permissions";
import type { DataFront, DBOutput } from "../lib/types";

export const ManagerRole = new ContentType({
  name: "ManagerRole",
  fields: {
    name: Fields.string().required(),
    permissions: Fields.select([...PermissionsList])
      .required()
      .multiple(),
  },
  uniques: [["name"]],
  listFields: ["name"],
}).hideFromManager();

export type ManagerRole = typeof ManagerRole;
export type ManagerRoleSchema = DataFront<ManagerRole>;
export type ManagerRoleManager = DBOutput<ManagerRole>;
