import { ObjectId } from "mongodb";
import { Id } from "../../lib/utils/id";

export function parseId(id: Id): ObjectId {
  return new ObjectId(id);
}
