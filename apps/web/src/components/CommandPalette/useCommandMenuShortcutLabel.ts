import { commandMenuShortcutLabel } from "@core/commandMenu/shortcut.ts";
import { useTranslation } from "react-i18next";

/** "⌘K" on Apple platforms, "Ctrl K" (localised) elsewhere. */
export function useCommandMenuShortcutLabel(): string {
  const { t } = useTranslation("commandPalette");
  return commandMenuShortcutLabel(
    globalThis.navigator?.platform ?? "",
    t("keys.ctrl"),
  );
}
