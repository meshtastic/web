import { cn } from "@core/utils/cn.ts";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { useTranslation } from "react-i18next";

const statusDotVariants = cva("inline-block shrink-0 rounded-full", {
  variants: {
    status: {
      online: "bg-online",
      offline: "bg-offline",
      dirty: "bg-dirty",
    },
    size: {
      sm: "size-2",
      md: "size-2.5",
      lg: "size-3",
    },
    /** Ring in the colour of what the dot sits on, to cut it out of an avatar. */
    cutout: {
      none: "",
      surface: "ring-2 ring-surface",
      app: "ring-2 ring-app",
      rail: "ring-2 ring-rail",
      selected: "ring-2 ring-selected",
    },
  },
  defaultVariants: {
    status: "online",
    size: "md",
    cutout: "none",
  },
});

export type StatusDotProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> &
  VariantProps<typeof statusDotVariants> & {
    /**
     * Accessible text. Defaults to Online / Offline / Unsaved changes;
     * `null` hides the dot when nearby text already says it.
     */
    label?: string | null;
  };

/** Presence / state indicator dot. */
export const StatusDot = ({
  status,
  size,
  cutout,
  label,
  className,
  ...props
}: StatusDotProps) => {
  const { t } = useTranslation("ui");
  const fallback =
    status === "offline"
      ? t("primitives.offline")
      : status === "dirty"
        ? t("primitives.unsavedChanges")
        : t("primitives.online");
  const accessible = label === undefined ? fallback : label;
  return (
    <span
      role={accessible === null ? undefined : "img"}
      aria-label={accessible ?? undefined}
      aria-hidden={accessible === null ? true : undefined}
      className={cn(statusDotVariants({ status, size, cutout }), className)}
      {...props}
    />
  );
};

export { statusDotVariants };
