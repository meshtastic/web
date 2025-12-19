import * as React from "react";

export function useWindowFocus() {
  const [isWindowFocused, setIsWindowFocused] = React.useState<boolean>(
    typeof document !== "undefined" ? !document.hidden : true,
  );

  React.useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowFocused(!document.hidden);
    };

    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    // Listen to visibility change (tab switching)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen to window focus/blur events
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return isWindowFocused;
}
