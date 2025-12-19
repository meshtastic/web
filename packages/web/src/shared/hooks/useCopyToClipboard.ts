import { useCallback, useEffect, useRef, useState } from "react";

interface UseCopyToClipboardProps {
  timeout?: number;
}

export function useCopyToClipboard({
  timeout = 2000,
}: UseCopyToClipboardProps = {}) {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        console.warn("Clipboard API not available");
        setIsCopied(false);
        return false;
      }

      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);

        timeoutRef.current = globalThis.setTimeout(() => {
          setIsCopied(false);
          timeoutRef.current = null;
        }, timeout);

        return true;
      } catch (error) {
        console.error("Failed to copy text to clipboard:", error);
        setIsCopied(false);
        return false;
      }
    },
    [timeout],
  );

  return { isCopied, copy };
}
