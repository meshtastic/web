import * as React from "react";

import { cn } from "@core/utils/cn.js";
import type { LucideIcon } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
  suffix?: string;
  action?: {
    icon: LucideIcon;
    onClick: () => void;
  };
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, action, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {prefix && (
          <span className="inline-flex items-center rounded-l-md bg-backgroundPrimary px-3 font-mono text-sm text-textSecondary brightness-hover">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-300 bg-transparent py-2 px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-slate-400 dark:focus:ring-offset-slate-900",
            action && "pr-8",
            className,
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-textSecondary">
            <span className="text-gray-500 sm:text-sm">{suffix}</span>
          </div>
        )}
        {action && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-400 focus:outline-none "
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

export { Input };
