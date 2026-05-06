import { Id } from "../../lib/utils/id";
import { getMongoDB } from "../mongodbPeer";

export const parseId = (id: Id) => {
  const { ObjectId } = getMongoDB();
  return new ObjectId(id.toString());
};
