import { useEffect, useRef } from "react";

export function useDocumentTitle(prefix: string) {
  const originalTitleRef = useRef<string>(document.title);

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
