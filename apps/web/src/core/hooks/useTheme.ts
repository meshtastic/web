import { useCallback, useEffect, useState } from "react";
import type { ThemeName } from "@core/theme/tokens.ts";

type Theme = ThemeName | "system";

const THEME_CHANGE_EVENT = "meshtastic:theme-change";

const getSystemTheme = (): ThemeName =>
  globalThis.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const readStoredPreference = (): Theme => {
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : "system";
};

/** Puts the stored (or system) theme on the document, for anything painted before `useTheme` runs. */
export function applyStoredTheme(): void {
  const preference = readStoredPreference();
  document.documentElement.setAttribute(
    "data-theme",
    preference === "system" ? getSystemTheme() : preference,
  );
}

export function useTheme() {
  const getStoredPreference = useCallback(readStoredPreference, []);

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
