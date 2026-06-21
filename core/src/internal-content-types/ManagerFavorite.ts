import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const ManagerFavorite = new ContentType({
  name: "ManagerFavorite",
  permissions: "ManagerFavorite",
  fields: {
    user: Fields.relation(ManagerUser).required(),
    contentType: Fields.string().required(),
    documentId: Fields.string().type("Id").required(),
  },
  uniques: [["user", "contentType", "documentId"]],
}).hideFromManager();

export type ManagerFavorite = typeof ManagerFavorite;
export type ManagerFavoriteManager = DBOutput<ManagerFavorite>;
