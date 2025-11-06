import { useEffect, useRef, useLayoutEffect } from "react";

export function useDocumentTitle(prefix: string) {
  const originalTitleRef = useRef<string>("");

  useLayoutEffect(() => {
    originalTitleRef.current = document.title;
  }, [prefix]);
  useEffect(() => {
    const newTitle = prefix
      ? `${prefix} - ${originalTitleRef.current}`
      : originalTitleRef.current;

    // Skip if the computed title hasn't changed
    if (document.title === newTitle) {
      return;
    }

    document.title = newTitle;

    return () => {
      document.title = originalTitleRef.current;
    };
  }, [prefix]);
}
