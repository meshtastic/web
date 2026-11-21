import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";

export interface StepDotsProps {
  /** 1-based current step. */
  current: number;
  total: number;
  /** Name of the current step, shown after "Step n of m". */
  stepName?: string;
  className?: string;
}

/** Onboarding progress: done and current dots in accent, current one wide. */
export const StepDots = ({
  current,
  total,
  stepName,
  className,
}: StepDotsProps) => {
  const { t } = useTranslation("ui");
  const steps = Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  const text = stepName
    ? t("primitives.stepOfNamed", { current, total, name: stepName })
    : t("primitives.stepOf", { current, total });
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step) => (
        <span
          key={step}
          aria-hidden="true"
          data-state={
            step === current ? "current" : step < current ? "done" : "todo"
          }
          className={cn(
            "h-1.5 rounded-full transition-all",
            step === current ? "w-7" : "w-3",
            step <= current ? "bg-accent" : "bg-control",
          )}
        />
      ))}
      <span className="ml-2 text-help text-muted">{text}</span>
    </div>
  );
};
