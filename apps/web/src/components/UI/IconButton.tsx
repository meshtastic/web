import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import { CountBadge } from "@components/UI/CountBadge.tsx";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type Ref,
  useId,
} from "react";
import { useTranslation } from "react-i18next";

const iconButtonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-muted hover:bg-raised hover:text-primary data-[state=open]:bg-raised",
        secondary: "bg-raised text-primary hover:bg-selected",
        accent: "bg-accent text-on-accent hover:opacity-90",
        danger: "bg-transparent text-danger hover:bg-danger",
        /** App rail item: accent icon on a tinted tile when current. */
        rail: "bg-transparent text-muted hover:bg-raised hover:text-primary aria-[current=page]:bg-rail-active aria-[current=page]:text-accent aria-pressed:bg-rail-active aria-pressed:text-accent",
      },
      size: {
        xs: "size-7 rounded-md",
        sm: "size-8 rounded-lg",
        md: "size-9 rounded-control",
        lg: "size-10 rounded-control",
        /** Minimum touch target. */
        touch: "size-11 rounded-card",
        /** App rail. */
        rail: "size-12 rounded-card",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export type IconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "children"
> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: an icon-only button has no other accessible name. */
    "aria-label": string;
    /** The icon, usually a lucide component. Hidden from assistive tech. */
    icon: ReactNode;
    /**
     * Unread count, shown in a corner badge and announced with the
     * button ("Messages", described by "4 unread messages").
     */
    count?: number;
    /**
     * Extra visual overlay. `aria-label` names the button, so anything in
     * here is not announced; use `count` for numbers that matter.
     */
    children?: ReactNode;
    ref?: Ref<HTMLButtonElement>;
  };

export const IconButton = ({
  className,
  variant,
  size,
  icon,
  count,
  children,
  type = "button",
  "aria-describedby": ariaDescribedBy,
  ...props
}: IconButtonProps) => {
  const { t } = useTranslation("ui");
  const countId = useId();
  const showCount = count !== undefined && count > 0;
  const describedBy =
    [ariaDescribedBy, showCount ? countId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <button
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      aria-describedby={describedBy}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {showCount ? (
        <>
          <CountBadge
            count={count}
            label={null}
            size="sm"
            aria-hidden="true"
            className="absolute top-1 right-1"
          />
          <span id={countId} hidden>
            {t("primitives.unread", { count })}
          </span>
        </>
      ) : null}
      {children}
    </button>
  );
};

export { iconButtonVariants };
