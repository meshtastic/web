import { useCopyToClipboard } from "@core/hooks/useCopyToClipboard.ts";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";
import { LimitCounter } from "@components/UI/LimitCounter.tsx";
import { cn } from "@core/utils/cn.ts";
import {
  evaluateTextLimit,
  type TextLimitSpec,
} from "@core/utils/textLimit.ts";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy, Eye, EyeOff, type LucideIcon, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

const cnInvalidBase = "border-danger-strong";
const cnDirtyBase = "border-dirty";

const inputVariants = cva(
  "flex h-10 w-full rounded-control border border-input bg-app py-2 px-3 text-body text-primary placeholder:text-muted focus:outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input",
        invalid: `${cnInvalidBase} focus-visible:border-danger-strong focus-visible:ring-danger-strong`,
        dirty: `${cnDirtyBase} focus-visible:border-dirty focus-visible:ring-dirty`,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type InputActionType = {
  id: string;
  icon: LucideIcon;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  tooltip?: string;
  condition?: boolean;
};

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix">,
    VariantProps<typeof inputVariants> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
  showClearButton?: boolean;
  containerClassName?: string;
  /**
   * Live `used/max` counter (bytes or characters) for a string value. The
   * field turns invalid once over the limit.
   */
  limit?: TextLimitSpec;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      variant,
      disabled,
      type = "text",
      prefix,
      suffix,
      showPasswordToggle,
      showCopyButton,
      showClearButton,
      limit,
      value,
      onChange,
      style,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const counterId = React.useId();
    // Width of the trailing counter / suffix / actions, which overlay the
    // input, so typed text never runs underneath them.
    const trailingRef = React.useRef<HTMLDivElement>(null);
    const [trailingWidth, setTrailingWidth] = React.useState(0);
    React.useLayoutEffect(() => {
      const node = trailingRef.current;
      if (!node) {
        return;
      }
      const measure = () => setTrailingWidth(node.offsetWidth);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      return () => observer.disconnect();
    }, []);
    const counted =
      limit !== undefined && typeof value === "string"
        ? { value, limit }
        : undefined;
    const overLimit =
      counted !== undefined &&
      evaluateTextLimit(counted.value, counted.limit).over;
    const effectiveVariant = overLimit ? "invalid" : variant;
    const { isVisible, toggleVisibility } = usePasswordVisibilityToggle();
    const { copy, isCopied } = useCopyToClipboard({ timeout: 1500 });
    const { t } = useTranslation("ui");

    const potentialActions: InputActionType[] = [
      {
        id: "clear-input",
        icon: X,
        onClick: (e) => {
          e.stopPropagation();
          if (onChange) {
            const event = {
              target: { value: "" },
              currentTarget: { value: "" },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
          }
          if (ref && typeof ref !== "function" && ref.current) {
            ref.current.focus();
          }
        },
        ariaLabel: t("clearInput.label"),
        tooltip: t("clearInput.label"),
        condition: !!showClearButton && !!value,
      },
      {
        id: "toggle-visibility",
        icon: isVisible ? EyeOff : Eye,
        onClick: (e) => {
          e.stopPropagation();
          toggleVisibility();
        },
        ariaLabel: isVisible
          ? t("notifications.hidePassword.label")
          : t("notifications.showPassword.label"),
        tooltip: isVisible
          ? t("notifications.hidePassword.label")
          : t("notifications.showPassword.label"),
        condition: !!showPasswordToggle && type === "password",
      },
      {
        id: "copy-value",
        icon: isCopied ? Check : Copy,
        onClick: (e) => {
          e.stopPropagation();
          if (value !== undefined && value !== null) {
            copy(String(value));
          }
        },
        ariaLabel: isCopied
          ? t("notifications.copied.label")
          : t("notifications.copyToClipboard.label"),
        tooltip: isCopied
          ? t("notifications.copied.label")
          : t("notifications.copyToClipboard.label"),
        condition: !!showCopyButton,
      },
    ];

    const actions = potentialActions.filter((action) => action.condition);

    const inputType = showPasswordToggle
      ? isVisible
        ? "text"
        : "password"
      : type;

    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;
    const hasActions = actions.length > 0;
    const describedBy =
      [ariaDescribedBy, counted ? counterId : undefined]
        .filter(Boolean)
        .join(" ") || undefined;

    const inputClassName = cn(
      inputVariants({ variant: effectiveVariant }),
      // Fallbacks until the trailing area is measured.
      hasActions && !hasSuffix && !counted && "pr-10",
      counted && "pr-16",
      hasPrefix && "rounded-l-none",
      className,
    );

    const extrasClassName = cn([
      effectiveVariant === "invalid" && `${cnInvalidBase} border-l-0`,
      effectiveVariant === "dirty" && `${cnDirtyBase} border-l-0`,
    ]);

    return (
      <div
        className={cn("relative flex w-full items-stretch", containerClassName)}
      >
        {prefix && (
          <span className="inline-flex items-center rounded-l-control border border-r-0 border-input bg-raised px-3 text-help text-secondary">
            {prefix}
          </span>
        )}

        <input
          type={inputType === "password" && isVisible ? "text" : inputType}
          className={inputClassName}
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...props}
          style={
            trailingWidth > 0
              ? { ...style, paddingRight: trailingWidth + 12 }
              : style
          }
          aria-invalid={overLimit || props["aria-invalid"]}
          aria-describedby={describedBy}
        />

        <div
          ref={trailingRef}
          className="absolute right-0 top-0 flex h-full items-stretch"
        >
          {counted && (
            <LimitCounter
              id={counterId}
              value={counted.value}
              limit={counted.limit}
              className="inline-flex items-center px-3"
            />
          )}
          {suffix && (
            <span
              className={cn(
                "inline-flex items-center border border-l-0 border-input bg-raised px-3 text-help text-secondary",
                extrasClassName,
                !hasActions && "rounded-r-control",
              )}
            >
              {suffix}
            </span>
          )}

          {hasActions && (
            <div
              className={cn(
                "flex items-center divide-x divide-input border border-l-0 border-input",
                extrasClassName,
                disabled && "opacity-50",
                !hasSuffix && "rounded-r-control",
                "bg-app",
              )}
            >
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={cn(
                    "inline-flex h-full items-center justify-center px-2.5 text-muted hover:bg-raised hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-focus last:hover:rounded-r-control",
                    disabled && "text-muted",
                    action.id === "copy-value" && isCopied && "text-accent",
                  )}
                  onClick={action.onClick}
                  aria-label={action.ariaLabel}
                  title={action.tooltip || action.ariaLabel}
                >
                  <action.icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
