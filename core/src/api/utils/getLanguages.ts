import { Language } from "../../internal-content-types";
import { getMongoService } from "../../orm";

export const getLanguages = async () => {
  const db = await getMongoService();
  return await db.getAll(Language);
};
