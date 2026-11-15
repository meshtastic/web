import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface TabLockOverlayProps {
  claiming: boolean;
  /** The lock has not been answered yet: nothing to act on. */
  pending?: boolean;
  onUseHere: () => void;
}

export function TabLockOverlay({
  claiming,
  pending = false,
  onUseHere,
}: TabLockOverlayProps) {
  const { t } = useTranslation("ui");
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pending) buttonRef.current?.focus();
  }, [pending]);

  return (
    <div
      data-shadcn-scope=""
      className="fixed inset-0 z-100 flex items-center justify-center bg-background p-4 text-foreground"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tab-lock-title"
        aria-describedby="tab-lock-description"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
      >
        <h1 id="tab-lock-title" className="text-xl font-semibold">
          {t("tabLock.title")}
        </h1>
        <p
          id="tab-lock-description"
          className="text-base text-muted-foreground"
        >
          {t("tabLock.description")}
        </p>
        <button
          ref={buttonRef}
          type="button"
          disabled={claiming || pending}
          onClick={onUseHere}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {claiming ? t("tabLock.claiming") : t("tabLock.useHere")}
        </button>
      </div>
    </div>
  );
}
