import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  /** Accessible name; defaults to "Progress". */
  label?: string;
  className?: string;
}

/** Thin determinate progress bar (sync, firmware upload). */
export const ProgressBar = ({ value, label, className }: ProgressBarProps) => {
  const { t } = useTranslation("ui");
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <progress
      aria-label={label ?? t("primitives.progress")}
      max={100}
      value={clamped}
      className={cn(
        "block h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-raised",
        "[&::-webkit-progress-bar]:bg-raised [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent",
        className,
      )}
    />
  );
};
