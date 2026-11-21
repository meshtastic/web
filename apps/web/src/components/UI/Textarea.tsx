import { LimitCounter } from "@components/UI/LimitCounter.tsx";
import { cn } from "@core/utils/cn.ts";
import {
  evaluateTextLimit,
  type TextLimitSpec,
} from "@core/utils/textLimit.ts";
import { type ComponentPropsWithoutRef, type Ref, useId } from "react";

type TextareaBase = Omit<ComponentPropsWithoutRef<"textarea">, "value"> & {
  /** Unsaved edit: amber border. */
  dirty?: boolean;
  invalid?: boolean;
  containerClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

/** A live `used/max` counter needs the value to count, so `limit` requires `value`. */
export type TextareaProps = TextareaBase &
  (
    | { value?: string; limit?: undefined }
    | { value: string; limit: TextLimitSpec }
  );

export const Textarea = ({
  className,
  containerClassName,
  value,
  limit,
  dirty = false,
  invalid = false,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) => {
  const counterId = useId();
  const counted =
    limit !== undefined && value !== undefined ? { value, limit } : undefined;
  const over =
    counted !== undefined &&
    evaluateTextLimit(counted.value, counted.limit).over;
  const describedBy =
    [ariaDescribedBy, counted ? counterId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={cn("relative flex w-full", containerClassName)}>
      <textarea
        value={value}
        className={cn(
          "min-h-20 w-full resize-y rounded-control border border-input bg-app px-3 py-2.5 text-body text-primary placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
          dirty && "border-dirty",
          (invalid || over) && "border-danger-strong",
          counted && "pb-7",
          className,
        )}
        {...props}
        aria-invalid={invalid || over || props["aria-invalid"]}
        aria-describedby={describedBy}
      />
      {counted ? (
        <LimitCounter
          id={counterId}
          value={counted.value}
          limit={counted.limit}
          className="pointer-events-none absolute right-3 bottom-2"
        />
      ) : null}
    </div>
  );
};
