"use client";

import {
  getTranslation,
  type LanguageSchema,
  type MaybeTranslatableValue,
} from "@rakun-kit/core/client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { useManagerClient } from "@/client/react";

type LanguageState = {
  languageList: LanguageSchema[];
  language: LanguageSchema;
  managerLanguage: LanguageSchema;
  setLanguage: (lang: LanguageSchema) => void;
  setManagerLanguage: (lang: LanguageSchema) => void;
  setLanguageList: (langs: LanguageSchema[]) => void;
  getTranslation: <T>(object: MaybeTranslatableValue<T>) => T;
  refetch: () => void;
};

const LANGUAGE_STORAGE_KEY = "cms-selected-language";
const MANAGER_LANGUAGE_STORAGE_KEY = "cms-selected-manager-language";

const LanguageStoreContext = createContext<StoreApi<LanguageState> | null>(null);

const getNextLanguage = (
  languages: LanguageSchema[],
  currentLanguage: LanguageSchema,
) => {
  const stillThere = languages.find((lang) => lang.code === currentLanguage.code);

  return (
    stillThere ??
    languages.find((lang) => lang.default) ??
    languages[0] ??
    currentLanguage
  );
};

export function createLanguageStore(
  initialLanguages: LanguageSchema[],
  initialLanguage: LanguageSchema,
) {
  return createStore<LanguageState>((set, get) => ({
    languageList: initialLanguages,
    language: initialLanguage,
    managerLanguage: initialLanguage,
    setLanguage: (language) => {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(language.code));
      } catch {}

      set({ language });
    },
    setManagerLanguage: (language) => {
      try {
        localStorage.setItem(
          MANAGER_LANGUAGE_STORAGE_KEY,
          JSON.stringify(language.code),
        );
      } catch {}

      set({ managerLanguage: language });
    },
    setLanguageList: (languages) => {
      const current = get().language;
      const next = getNextLanguage(languages, current);
      set({ languageList: languages, language: next });
    },
    getTranslation: <T,>(object: MaybeTranslatableValue<T>) => {
      const { language, languageList } = get();
      return getTranslation(object, language, languageList);
    },
    refetch: () => {},
  }));
}

export type LanguageProviderProps = {
  languages: LanguageSchema[];
  initialLanguage: LanguageSchema;
  children: ReactNode;
};

export function LanguageProvider({
  languages,
  initialLanguage,
  children,
}: LanguageProviderProps) {
  const client = useManagerClient();
  const store = useMemo(
    () => createLanguageStore(languages, initialLanguage),
    [languages, initialLanguage],
  );

  useEffect(() => {
    // Patch in place — do not store.setState, or every useLanguage() subscriber re-renders.
    store.getState().refetch = () => {
      void client
        .request('manager.languages' as never, undefined as never)
        .then((nextLanguages) => {
          store.getState().setLanguageList(nextLanguages as LanguageSchema[])
        })
    }
  }, [client, store])

  useEffect(() => {
    try {
      const rawLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const rawManagerLanguage = localStorage.getItem(
        MANAGER_LANGUAGE_STORAGE_KEY,
      );

      if (rawLanguage) {
        const languageCode = JSON.parse(rawLanguage);
        const language = languages.find((lang) => lang.code === languageCode);

        if (language && language.code !== store.getState().language.code) {
          store.getState().setLanguage(language);
        }
      }

      if (rawManagerLanguage) {
        const languageCode = JSON.parse(rawManagerLanguage);
        const language = languages.find((lang) => lang.code === languageCode);

        if (
          language &&
          language.code !== store.getState().managerLanguage.code
        ) {
          store.getState().setManagerLanguage(language);
        }
      }
    } catch {}
  }, [languages, store]);

  return (
    <LanguageStoreContext.Provider value={store}>
      {children}
    </LanguageStoreContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageStoreContext);

  if (!ctx) {
    throw new Error("useLanguage must be used within <LanguageProvider>.");
  }

  return useStore(ctx);
}
