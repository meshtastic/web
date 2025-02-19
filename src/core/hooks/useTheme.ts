import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (
      (document.documentElement.getAttribute("data-theme") as Theme) || "light"
    );
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          const newTheme = document.documentElement.getAttribute(
            "data-theme",
          ) as Theme;
          setTheme(newTheme);
        }
      }
    });

    // Observe the document element for data-theme attribute changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Cleanup observer on unmount
    return () => observer.disconnect();
  }, []);

  return theme;
}
