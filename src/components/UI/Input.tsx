import * as React from "react";

import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";

const inputVariants = cva(
  "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900 dark:open-dialog:text-slate-900",
  {
    variants: {
      variant: {
        default: "border-slate-300 dark:border-slate-700",
        invalid: "border-red-500 dark:border-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface InputProps
  extends
  React.InputHTMLAttributes<HTMLInputElement>,
  VariantProps<typeof inputVariants> {
  prefix?: string;
  suffix?: string;
  action?: {
    icon: LucideIcon;
    onClick: () => void;
  };
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, value, variant, prefix, suffix, action, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {prefix && (
          <label className="inline-flex items-center rounded-l-md bg-slate-100/80 px-3 font-mono text-sm text-slate-600">
            {prefix}
          </label>
        )}
        <input
          className={cn(
            action && "pr-8",
            inputVariants({ variant }),
            className,
          )}
          value={value}
          ref={ref}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-9 font-mono text-slate-500 dark:text-slate-900">
            <span className="text-slate-100/40 sm:text-sm">{suffix}</span>
          </div>
        )}
        {action && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-400 focus:outline-hidden "
            onClick={action.onClick}
          >
            <action.icon size={20} />
          </button>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input, inputVariants };
