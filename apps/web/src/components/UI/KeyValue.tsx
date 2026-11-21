import { cn } from "@core/utils/cn.ts";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Wraps KeyValue rows or tiles in a description list. */
export const KeyValueList = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"dl">) => (
  <dl className={cn("m-0 flex flex-col", className)} {...props} />
);

export interface KeyValueProps {
  label: ReactNode;
  value: ReactNode;
  /**
   * `row`: label left, value right (device details).
   * `tile`: small label over a bold value on an inset tile (signal stats).
   */
  variant?: "row" | "tile";
  /** Monospace value, for ids and keys. */
  mono?: boolean;
  className?: string;
}

/** One label/value pair; place inside KeyValueList. */
export const KeyValue = ({
  label,
  value,
  variant = "row",
  mono = false,
  className,
}: KeyValueProps) =>
  variant === "tile" ? (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-control bg-chat p-2.5",
        className,
      )}
    >
      <dt className="text-meta text-muted">{label}</dt>
      <dd className={cn("m-0 truncate font-semibold", mono && "font-mono")}>
        {value}
      </dd>
    </div>
  ) : (
    <div
      className={cn("flex justify-between gap-3 py-1.5 text-help", className)}
    >
      <dt className="text-muted">{label}</dt>
      <dd
        className={cn(
          "m-0 min-w-0 text-right font-medium break-words",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
