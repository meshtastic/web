/**
 * useTheme - React 19 hook using useSyncExternalStore
 *
 * Subscribes to both localStorage (preference) and matchMedia (system theme)
 * without tearing issues.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";
type ActualTheme = "light" | "dark";

const STORAGE_KEY = "theme";

// ==================== System Theme Store ====================

const systemThemeStore = {
  getSnapshot(): ActualTheme {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  },

  subscribe(onStoreChange: () => void): () => void {
    const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => onStoreChange();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  },
};

// ==================== Theme Preference Store ====================

const themePreferenceStore = {
  getSnapshot(): Theme {
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  },

  subscribe(onStoreChange: () => void): () => void {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        onStoreChange();
      }
    };

    const handleLocalStorage = (event: CustomEvent<{ key: string }>) => {
      if (event.detail?.key === STORAGE_KEY) {
        onStoreChange();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "local-storage",
      handleLocalStorage as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "local-storage",
        handleLocalStorage as EventListener,
      );
    };
  },

  set(preference: Theme): void {
    localStorage.setItem(STORAGE_KEY, preference);
    window.dispatchEvent(
      new CustomEvent("local-storage", { detail: { key: STORAGE_KEY } }),
    );
  },
};

// ==================== Hook ====================

export function useTheme() {
  // Subscribe to system theme changes
  const systemTheme = useSyncExternalStore(
    systemThemeStore.subscribe,
    systemThemeStore.getSnapshot,
    systemThemeStore.getSnapshot,
  );

  // Subscribe to preference changes
  const preference = useSyncExternalStore(
    themePreferenceStore.subscribe,
    themePreferenceStore.getSnapshot,
    themePreferenceStore.getSnapshot,
  );

  // Compute actual theme
  const theme: ActualTheme = preference === "system" ? systemTheme : preference;

  // Ref-based stable callback for applying theme to DOM
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const applyTheme = useCallback(() => {
    document.documentElement.setAttribute("data-theme", themeRef.current);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    applyTheme();
  }, [theme, applyTheme]);

  // Stable setter
  const setPreference = useCallback((newPreference: Theme) => {
    themePreferenceStore.set(newPreference);
  }, []);

  return { theme, preference, setPreference };
}
