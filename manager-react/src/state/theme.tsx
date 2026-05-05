"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ManagerTheme = "light" | "dark" | "system";
export type ResolvedManagerTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ManagerTheme;
  resolvedTheme: ResolvedManagerTheme;
  setTheme: (theme: ManagerTheme) => void;
};

const STORAGE_KEY = "rakun-manager-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemTheme = (): ResolvedManagerTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (theme: ResolvedManagerTheme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
};

export function ManagerThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ManagerTheme>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedManagerTheme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(
      STORAGE_KEY,
    ) as ManagerTheme | null;
    if (
      storedTheme === "light" ||
      storedTheme === "dark" ||
      storedTheme === "system"
    ) {
      setThemeState(storedTheme);
      return;
    }

    setThemeState("system");
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolvedTheme = () => {
      const nextResolvedTheme = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(nextResolvedTheme);
      applyTheme(nextResolvedTheme);
    };

    updateResolvedTheme();

    const handleChange = () => {
      if (theme === "system") {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (nextTheme: ManagerTheme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useManagerTheme = () => {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useManagerTheme must be used within ManagerThemeProvider");
  }

  return value;
};
