import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

/**
 * Small status pill (role, "MQTT", "Admin", ...). `secondary` and
 * `destructive` are kept from the previous API.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-meta font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-raised text-secondary",
        secondary: "border-transparent bg-raised text-secondary",
        accent: "border-accent-tint bg-accent-tint text-on-accent-tint",
        warning: "border-warning bg-warning text-warning",
        danger: "border-danger bg-danger text-on-danger",
        destructive: "border-danger bg-danger text-on-danger",
        outline: "border-control bg-transparent text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
