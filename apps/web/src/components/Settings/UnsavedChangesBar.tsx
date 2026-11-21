import { Button } from "@components/UI/Button.tsx";
import { StatusDot } from "@components/UI/StatusDot.tsx";
import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

export interface UnsavedChangesBarProps {
  /** What saving does, e.g. "Saving restarts EAO1…". */
  note: string;
  /** Shown instead of the note while Save is blocked by invalid fields. */
  error?: string;
  onReset: () => void;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  className?: string;
}

/**
 * Floating bar over the bottom of the settings page while edits are
 * pending: what saving will do, Reset and Save.
 */
export const UnsavedChangesBar = ({
  note,
  error,
  onReset,
  onSave,
  saving = false,
  saveDisabled = false,
  className,
}: UnsavedChangesBarProps) => {
  const { t } = useTranslation("config");
  return (
    <section
      aria-label={t("settingsLayout.unsavedTitle")}
      className={cn(
        "flex w-full max-w-[720px] flex-wrap items-center gap-3 rounded-panel border border-warning-subtle bg-app py-3 pr-3 pl-4.5 shadow-floating",
        className,
      )}
    >
      <StatusDot status="dirty" size="md" label={null} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="font-semibold">
          {t("settingsLayout.unsavedTitle")}
        </span>
        <span
          className={cn("text-meta", error ? "text-danger" : "text-muted")}
          aria-live="polite"
        >
          {error ?? note}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" disabled={saving} onClick={onReset}>
          {t("button.reset", { ns: "common" })}
        </Button>
        <Button
          variant="primary"
          disabled={saving || saveDisabled}
          aria-busy={saving || undefined}
          onClick={onSave}
        >
          {t("button.saveChanges", { ns: "common" })}
        </Button>
      </div>
    </section>
  );
};
