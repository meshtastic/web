import * as React from "react";
import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Copy, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useCopyToClipboard } from "@core/hooks/useCopyToClipboard.ts";
import { usePasswordVisibilityToggle } from "@core/hooks/usePasswordVisibilityToggle.ts";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-600",
  {
    variants: {
      variant: {
        default: "border-slate-300 dark:border-slate-700",
        invalid:
          "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type InputActionType = {
  id: string;
  icon: LucideIcon;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  tooltip?: string;
};

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix" | "suffix">,
  VariantProps<typeof inputVariants> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  showPasswordToggle?: boolean;
  showCopyButton?: boolean;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      variant,
      type = "text",
      prefix,
      suffix,
      showPasswordToggle,
      showCopyButton,
      value,
      ...props
    },
    ref
  ) => {
    const { isVisible, toggleVisibility } = usePasswordVisibilityToggle();
    const { copy, isCopied } = useCopyToClipboard({ timeout: 1500 });

    const actions: InputActionType[] = [];

    if (showPasswordToggle && type === "password") {
      actions.push({
        id: "toggle-visibility",
        icon: isVisible ? EyeOff : Eye,
        onClick: (e) => {
          e.stopPropagation();
          toggleVisibility();
        },
        ariaLabel: isVisible ? "Hide password" : "Show password",
        tooltip: isVisible ? "Hide password" : "Show password",
      });
    }
    if (showCopyButton) {
      actions.push({
        id: "copy-value",
        icon: isCopied ? Check : Copy,
        onClick: (e) => {
          e.stopPropagation();
          if (value !== undefined && value !== null) {
            copy(String(value));
          }
        },
        ariaLabel: isCopied ? "Copied!" : "Copy to clipboard",
        tooltip: isCopied ? "Copied!" : "Copy to clipboard",
      });
    }

    const inputType = showPasswordToggle ? (isVisible ? "text" : "password") : type;

    const hasPrefix = !!prefix;
    const hasSuffix = !!suffix;
    const hasActions = actions.length > 0;

    const inputClassName = cn(
      inputVariants({ variant }),
      hasPrefix && "rounded-l-none",
      (hasSuffix || hasActions) && "rounded-r-none border-r-0",
      className
    );


    return (
      <div className={cn("relative flex w-full items-stretch", containerClassName)}>
        {prefix && (
          <span className="inline-flex items-center rounded-l-md border  border-slate-300 bg-slate-100/80 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300">
            {prefix}
          </span>
        )}

        <input
          type={inputType === "password" && isVisible ? "text" : inputType}
          className={inputClassName}
          ref={ref}
          value={value}
          {...props}
        />

        {(hasSuffix || hasActions) && (
          <div className={cn(
            "flex items-stretch",
            !hasSuffix && hasActions && "border-y border-r border-slate-300 dark:border-slate-700 rounded-r-md"
          )}>
            {suffix && (
              <span className={cn(
                "inline-flex items-center border border-slate-300 bg-slate-100/80 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300",
                !hasActions && "rounded-r-md"
              )}>
                {suffix}
              </span>
            )}
            {actions.length > 0 && (
              <div className={cn(
                "flex h-full items-center divide-x divide-slate-300 dark:divide-slate-700",
                !hasSuffix && "border-l border-slate-300 dark:border-slate-700"
              )}>
                {actions?.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={cn(
                      "inline-flex h-full items-center justify-center px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 dark:focus:ring-slate-500",
                      action.id === 'copy-value' && isCopied && "text-green-600 dark:text-green-500"
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
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };