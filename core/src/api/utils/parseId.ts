import type { ObjectId } from "mongodb";

import { Id } from "../../lib/utils/id";
import { getMongoDB } from "../../orm/mongodbPeer";

export function parseId(id: Id): ObjectId {
  const { ObjectId } = getMongoDB();
  return new ObjectId(id);
}
