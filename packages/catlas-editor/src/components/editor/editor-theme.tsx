import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

type ThemeContextValue = {
  readonly theme: ThemeMode;
  readonly setTheme: (theme: ThemeMode) => void;
};

const THEME_STORAGE_KEY = "catlas-editor:theme";
const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === "light" || value === "dark" || value === "system";

const readStoredTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "system";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(storedTheme) ? storedTheme : "system";
  } catch {
    return "system";
  }
};

const resolveTheme = (theme: ThemeMode): Exclude<ThemeMode, "system"> =>
  theme === "system" ? (window.matchMedia(DARK_THEME_QUERY).matches ? "dark" : "light") : theme;

const applyTheme = (theme: ThemeMode) => {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const resolvedTheme = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = resolvedTheme;
};

export const initializeTheme = () => applyTheme(readStoredTheme());

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme changes should still work when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia(DARK_THEME_QUERY);
    const handleSystemThemeChange = () => applyTheme("system");
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
