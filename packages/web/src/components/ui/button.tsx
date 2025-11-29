import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-slate-400 disabled:cursor-not-allowed dark:focus:ring-offset-slate-900 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-slate-900 text-white dark:bg-slate-50 hover:dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-500",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600",
        success:
          "bg-green-500 text-white hover:bg-green-600 dark:hover:bg-green-600",
        outline:
          "bg-transparent border border-slate-400 hover:text-slate-400 dark:hover:text-slate-300 dark:border-slate-400 dark:text-slate-100 ",
        subtle:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-400",
        ghost:
          "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-100 dark:hover:text-slate-100 data-[state=open]:bg-transparent dark:data-[state=open]:bg-transparent",
        link: "bg-transparent underline-offset-4 hover:underline text-slate-900 dark:text-slate-100 hover:bg-transparent dark:hover:bg-transparent",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-2 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  iconAlignment?: "left" | "right";
}

const Button = ({
  className,
  variant,
  size,
  disabled,
  icon,
  iconAlignment = "left",
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant, size, className }),
        { "cursor-not-allowed": disabled },
        "inline-flex items-center",
      )}
      disabled={disabled}
      {...props}
    >
      {icon && iconAlignment === "left" && (
        <span className={cn({ "mr-2": !!children })}>{icon}</span>
      )}
      {children}
      {icon && iconAlignment === "right" && (
        <span className={cn({ "ml-2": !!children })}>{icon}</span>
      )}
    </button>
  );
};

export { Button, buttonVariants };
