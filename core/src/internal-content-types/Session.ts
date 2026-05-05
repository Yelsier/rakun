import ContentType from "../lib/ContentType";
import { Fields } from "../lib/fields";
import type { DBOutput } from "../lib/types";
import { ManagerUser } from "./ManagerUser";

export const Session = new ContentType({
  name: "Session",
  fields: {
    token: Fields.string().required(),
    user: Fields.relation(ManagerUser).required(),
    expiresAt: Fields.date().required(),
  },
  uniques: [["token"]],
}).hideFromManager();

export type Session = typeof Session;
export type SessionManager = DBOutput<Session>;
