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

export const MANAGER_THEME_STORAGE_KEY = "rakun-manager-theme";

export const MANAGER_THEME_INIT_SCRIPT = `(() => {
  try {
    const storedTheme = window.localStorage.getItem("${MANAGER_THEME_STORAGE_KEY}");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme;
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch {
  }
})();`;

const ThemeContext = createContext<ThemeContextValue | null>(null);

const getSystemTheme = (): ResolvedManagerTheme =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const isManagerTheme = (theme: string | null): theme is ManagerTheme =>
  theme === "light" || theme === "dark" || theme === "system";

const getInitialTheme = (): ManagerTheme => {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedTheme = window.localStorage.getItem(MANAGER_THEME_STORAGE_KEY);

  return isManagerTheme(storedTheme) ? storedTheme : "system";
};

const resolveTheme = (theme: ManagerTheme): ResolvedManagerTheme =>
  theme === "system" ? getSystemTheme() : theme;

const applyTheme = (theme: ResolvedManagerTheme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
};

export function ManagerThemeScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: MANAGER_THEME_INIT_SCRIPT }}
    />
  );
}

export function ManagerThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ManagerTheme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedManagerTheme>(
    () =>
      typeof window === "undefined" ? "light" : resolveTheme(getInitialTheme()),
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolvedTheme = () => {
      const nextResolvedTheme = resolveTheme(theme);
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
    window.localStorage.setItem(MANAGER_THEME_STORAGE_KEY, nextTheme);
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
