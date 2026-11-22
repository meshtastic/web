import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CircleCheckIcon,
  InfoIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const calloutVariants = cva(
  "flex gap-2.5 rounded-card border px-3.5 py-3 text-help leading-normal",
  {
    variants: {
      tone: {
        info: "border-control bg-inset text-secondary",
        success: "border-accent-tint bg-accent-tint text-on-accent-tint",
        warning: "border-warning bg-warning text-warning",
        danger: "border-danger bg-danger text-danger",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const defaultIcon = {
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
  danger: OctagonAlertIcon,
} as const;

export type CalloutProps = Omit<ComponentPropsWithoutRef<"div">, "title"> &
  VariantProps<typeof calloutVariants> & {
    title?: ReactNode;
    /** Replaces the tone's icon; `null` for none. */
    icon?: ReactNode | null;
  };

/**
 * Inline banner for context the user should notice: unsupported browser,
 * region not set, a failure with next steps.
 */
export const Callout = ({
  tone,
  title,
  icon,
  className,
  children,
  ...props
}: CalloutProps) => {
  const Icon = defaultIcon[tone ?? "info"];
  return (
    <div className={cn(calloutVariants({ tone }), className)} {...props}>
      {icon === null ? null : (
        <span aria-hidden="true" className="mt-0.5 inline-flex shrink-0">
          {icon ?? <Icon className="size-4" />}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <span className="font-semibold">{title}</span> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
};

export { calloutVariants };
