import { Button } from "@components/UI/Button.tsx";
import { cn } from "@core/utils/cn.ts";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";

/** Id of the "Step n of m" counter, which describes each step heading. */
export const StepCounterContext = createContext<string | undefined>(undefined);

export interface StepHeadingProps {
  children: ReactNode;
  /** The welcome title is a size larger than the others. */
  large?: boolean;
}

/**
 * The step's title. It takes focus when the step appears, so keyboard and
 * screen reader users land on the new step instead of a removed button.
 */
export const StepHeading = ({ children, large }: StepHeadingProps) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const counterId = useContext(StepCounterContext);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      aria-describedby={counterId}
      className={cn(
        "font-bold text-primary outline-none",
        large
          ? "text-title-lg md:text-display-lg"
          : "text-title-lg md:text-display",
      )}
    >
      {children}
    </h1>
  );
};

export const StepBody = ({ children }: { children: ReactNode }) => (
  <p className="text-header-lg leading-relaxed text-secondary">{children}</p>
);

export interface StepAction {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Submits the step's form instead of running `onClick`. */
  form?: string;
}

export interface StepActionsProps {
  back?: StepAction;
  secondary?: StepAction;
  next?: StepAction;
}

/** Back on the left; a quiet secondary and the accent next on the right. */
export const StepActions = ({ back, secondary, next }: StepActionsProps) => (
  <div className="flex flex-wrap items-center gap-2.5">
    {back ? (
      <Button
        variant="outline"
        size="lg"
        className="h-12 rounded-card px-5"
        onClick={back.onClick}
        disabled={back.disabled}
      >
        {back.label}
      </Button>
    ) : null}
    <div className="flex-1" />
    {secondary ? (
      <Button
        variant="ghost"
        size="lg"
        className="h-12 rounded-card px-4 text-secondary"
        onClick={secondary.onClick}
        disabled={secondary.disabled}
      >
        {secondary.label}
      </Button>
    ) : null}
    {next ? (
      <Button
        variant="primary"
        size="lg"
        className="ml-auto h-12 rounded-card px-6"
        type={next.form ? "submit" : "button"}
        form={next.form}
        onClick={next.form ? undefined : next.onClick}
        disabled={next.disabled}
      >
        {next.label}
      </Button>
    ) : null}
  </div>
);

export interface StepShellProps {
  children: ReactNode;
  actions: StepActionsProps;
}

/** A step's content, pushed apart from its actions at the bottom of the card. */
export const StepShell = ({ children, actions }: StepShellProps) => (
  <>
    <div className="flex flex-col gap-4">{children}</div>
    <div className="min-h-4 flex-1" />
    <StepActions {...actions} />
  </>
);
