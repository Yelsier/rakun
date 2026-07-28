import { Language } from "../../internal-content-types";
import type { DBOutput } from "../../lib/types";
import { getMongoService } from "../../orm";

export const getLanguages = async (): Promise<DBOutput<typeof Language>[]> => {
  const db = await getMongoService();
  const languages = await db.getAll(Language);

  return languages.map((language) => {
    if ((language as { parent?: unknown }).parent !== null) {
      return language;
    }

    const { parent: _parent, ...rest } = language as DBOutput<typeof Language> & {
      parent?: unknown;
    };

    return rest as DBOutput<typeof Language>;
  });
};
