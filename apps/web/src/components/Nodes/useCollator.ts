import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/** Case- and accent-insensitive collator for the UI language. */
export function useCollator(): Intl.Collator {
  const { i18n } = useTranslation();
  return useMemo(
    () => new Intl.Collator(i18n.language, { sensitivity: "base" }),
    [i18n.language],
  );
}
