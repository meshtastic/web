import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const THEME_CHANGE_EVENT = "meshtastic:theme-change";

export function useTheme() {
  const getSystemTheme = () =>
    globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const getStoredPreference = useCallback(
    (): Theme => (localStorage.getItem("theme") as Theme) || "system",
    [],
  );

  const [preference, setPreference] = useState<Theme>(() =>
    typeof window !== "undefined" ? getStoredPreference() : "light",
  );

  const theme = preference === "system" ? getSystemTheme() : preference;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setPreference(getStoredPreference());

    media.addEventListener("change", updateTheme);
    return () => media.removeEventListener("change", updateTheme);
  }, [preference, getStoredPreference]);

  // Several components use this hook (App, the sidebar panel, App
  // settings); keep every instance on the same preference.
  useEffect(() => {
    const sync = () => setPreference(getStoredPreference());
    globalThis.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => globalThis.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, [getStoredPreference]);

  const setPreferenceValue = (newPreference: Theme) => {
    localStorage.setItem("theme", newPreference);
    setPreference(newPreference);
    globalThis.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, preference, setPreference: setPreferenceValue };
}
