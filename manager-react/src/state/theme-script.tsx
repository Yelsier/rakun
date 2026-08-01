export const MANAGER_THEME_STORAGE_KEY = 'rakun-manager-theme'

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
})();`

/**
 * Blocking theme bootstrap for the initial HTML response.
 * Must be rendered from a Server Component (or the document shell),
 * not from a Client Component — React never executes client-rendered scripts.
 */
export function ManagerThemeScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: MANAGER_THEME_INIT_SCRIPT }}
    />
  )
}
