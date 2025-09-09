import { useCopyToClipboard } from "@core/hooks/useCopyToClipboard.ts";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";
import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy, Eye, EyeOff, type LucideIcon, X } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

const cnInvalidBase = "border-2 border-red-500 dark:border-red-500";
const cnDirtyBase = "border-2 border-sky-500 dark:border-sky-500";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:bg-transparent dark:text-slate-100 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-600",
  {
    variants: {
      variant: {
        default: "border-slate-300 dark:border-slate-500",
        invalid: `${cnInvalidBase} focus:ring-red-500 dark:focus:ring-red-500`,
        dirty: `${cnDirtyBase} focus:ring-sky-500 dark:focus:ring-sky-500`,
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
  extends Omit<
      React.InputHTMLAttributes<HTMLInputElement>,
      "prefix" | "suffix"
    >,
    VariantProps<typeof inputVariants> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
  showClearButton?: boolean;
  containerClassName?: string;
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
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
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

    const inputClassName = cn(
      inputVariants({ variant }),
      hasActions && !hasSuffix && "pr-10",
      hasPrefix && "rounded-l-none",
      className,
    );

    const extrasClassName = cn([
      variant === "invalid" && `${cnInvalidBase} border-l-0`,
      variant === "dirty" && `${cnDirtyBase} border-l-0`,
    ]);

    return (
      <div
        className={cn("relative flex w-full items-stretch", containerClassName)}
      >
        {prefix && (
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-100/80 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-200 dark:text-slate-700">
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
        />

        <div className="absolute right-0 top-0 flex h-full items-stretch">
          {suffix && (
            <span
              className={cn(
                "inline-flex items-center border border-l-0 border-slate-300 bg-slate-100/80 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300",
                extrasClassName,
                !hasActions && "rounded-r-md",
              )}
            >
              {suffix}
            </span>
          )}

          {hasActions && (
            <div
              className={cn(
                "flex items-center divide-x divide-slate-300 border border-l-0 border-slate-300 dark:divide-slate-700 dark:border-slate-500",
                extrasClassName,
                disabled &&
                  "border-slate-200 dark:border-slate-700 divide-slate-200",
                !hasSuffix && "rounded-r-md",
                "bg-white dark:bg-slate-800",
              )}
            >
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={cn(
                    "inline-flex h-full items-center justify-center px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 dark:focus:ring-slate-500 last:hover:rounded-r-md last:dark:hover:rounded-r-md",
                    disabled && "text-slate-300 dark:text-slate-600",
                    action.id === "copy-value" &&
                      isCopied &&
                      "text-green-600 dark:text-green-500",
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
