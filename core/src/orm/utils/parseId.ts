import { ObjectId } from "mongodb";
import { Id } from "../../lib/utils/id";

export const parseId = (id: Id) => {
  return new ObjectId(id.toString());
};
