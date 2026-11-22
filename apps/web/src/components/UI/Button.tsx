import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const accent = "bg-accent text-on-accent font-semibold hover:opacity-90";
const secondary = "bg-raised text-primary hover:bg-selected";
const danger =
  "border border-danger bg-danger text-on-danger font-semibold hover:border-danger-strong";

/**
 * Buttons per the redesign: 10px radius, 40px tall by default, 44px for
 * touch. `primary` is the accent action; `default`, `success`, `subtle` and
 * `destructive` are kept for existing callers and map onto the new looks.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-control text-body font-medium transition-colors cursor-pointer pointer-coarse:touch-target focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: accent,
        default: accent,
        success: accent,
        secondary,
        subtle: secondary,
        outline:
          "border border-control bg-transparent text-primary hover:bg-raised",
        ghost:
          "bg-transparent text-primary hover:bg-raised data-[state=open]:bg-raised",
        danger,
        destructive: danger,
        dangerGhost: "bg-transparent text-danger hover:bg-danger",
        link: "bg-transparent text-accent underline-offset-4 hover:underline hover:text-accent-hover",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3 text-help",
        lg: "h-11 px-6",
        touch: "h-11 px-4",
        icon: "size-10",
        /** No box: for inline text links. */
        inline: "h-auto p-0",
      },
    },
    // A link reads like text whatever size it is given.
    compoundVariants: [{ variant: "link", class: "h-auto px-0" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: React.ReactNode;
  iconAlignment?: "left" | "right";
  /** React 19: the ref is an ordinary prop, forwarded to the button. */
  ref?: React.Ref<HTMLButtonElement>;
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
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled}
      {...props}
    >
      {icon && iconAlignment === "left" && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
      {children}
      {icon && iconAlignment === "right" && (
        <span className="inline-flex shrink-0">{icon}</span>
      )}
    </button>
  );
};

export { Button, buttonVariants };
