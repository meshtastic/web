import { preferencesRepo } from "@db/repositories";
import { createContext, use, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

const THEME_PREFERENCE_KEY = "appearance:theme";

// Cache the promise so it's stable across renders
let themePromise: Promise<Theme | undefined> | null = null;
function getThemePromise(): Promise<Theme | undefined> {
  if (!themePromise) {
    themePromise = preferencesRepo.get<Theme>(THEME_PREFERENCE_KEY);
  }
  return themePromise;
}

function ThemeProviderInner({
  children,
  defaultTheme,
  ...props
}: ThemeProviderProps) {
  const storedTheme = use(getThemePromise());
  const [theme, setThemeState] = useState<Theme>(storedTheme ?? defaultTheme ?? "system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Apply theme to document and listen for system changes
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (systemDark: boolean) => {
      root.classList.remove("light", "dark");

      if (theme === "system") {
        const systemTheme = systemDark ? "dark" : "light";
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      } else {
        root.classList.add(theme);
        setResolvedTheme(theme);
      }
    };

    applyTheme(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        applyTheme(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    // Invalidate cache and persist
    themePromise = null;
    preferencesRepo.set(THEME_PREFERENCE_KEY, newTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme],
  );

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function ThemeProvider(props: ThemeProviderProps) {
  return <ThemeProviderInner {...props} />;
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
