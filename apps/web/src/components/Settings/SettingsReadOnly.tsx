import { createContext, type ReactNode, useContext } from "react";

/**
 * True while the open settings section can't be changed, e.g. the
 * connected radio is in managed mode and ignores this app's admin writes.
 */
export const SettingsReadOnlyContext = createContext(false);

export const useSettingsReadOnly = (): boolean =>
  useContext(SettingsReadOnlyContext);

/** Wraps the action buttons of one row, e.g. a key row's Edit and Regenerate. */
export const READ_ONLY_INLINE_CLASS =
  "m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0";

/** Wraps a run of settings rows inside a card, keeping the row dividers. */
export const READ_ONLY_ROWS_CLASS =
  "m-0 min-w-0 border-x-0 border-t border-b-0 border-subtle p-0 first:border-t-0";

/**
 * Disables every control inside while settings are read-only: form fields
 * and plain buttons alike. Renders its children unwrapped otherwise.
 *
 * Copy buttons must stay usable, so wrap only the editable controls: a
 * disabled fieldset disables every button inside it.
 */
export const ReadOnlyFieldset = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  const readOnly = useSettingsReadOnly();
  if (!readOnly) return children;
  return (
    <fieldset
      disabled
      className={className ?? "m-0 flex min-w-0 flex-col gap-5 border-0 p-0"}
    >
      {children}
    </fieldset>
  );
};
