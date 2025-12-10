import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type ActualTheme = "light" | "dark";

export function useTheme() {
  const getSystemPreferredTheme = useCallback(() =>
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    [],
  );

  const getStoredPreference = useCallback(
    (): Theme => (localStorage.getItem("theme") as Theme) || "system",
    [],
  );

  const [preference, setPreference] = useState<Theme>(() =>
    typeof window !== "undefined" ? getStoredPreference() : "light",
  );

  const [systemTheme, setSystemTheme] = useState<ActualTheme>(() =>
    typeof window !== "undefined" ? getSystemPreferredTheme() : "light",
  );

  const theme: ActualTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []); // Empty dependency array, listener only needs to be set up once

  const setPreferenceValue = (newPreference: Theme) => {
    localStorage.setItem("theme", newPreference);
    setPreference(newPreference);
  };

  return { theme, preference, setPreference: setPreferenceValue };
}

