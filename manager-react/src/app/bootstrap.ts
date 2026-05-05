import type { LanguageSchema, ManagerUserSchema } from "@rakun-kit/core/client";

import type { ManagerClient } from "@/client/request";
import { fallbackLanguage } from "@/helpers/fallbackLanguage";

export type ManagerBootstrapData = {
  user: ManagerUserSchema | null;
  languages: LanguageSchema[];
  initialLanguage: LanguageSchema | null;
};

export const loadManagerBootstrap = async (
  client: ManagerClient,
): Promise<ManagerBootstrapData> => {
  const [user, languages] = await Promise.all([
    client.request("manager.auth.getSession"),
    client.request("manager.languages"),
  ]);

  if (languages.length === 0) {
    languages.push(fallbackLanguage);
  }

  const initialLanguage =
    languages.find((language) => language.default) || languages[0];

  return {
    user,
    languages,
    initialLanguage,
  };
};
