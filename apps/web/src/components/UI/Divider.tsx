import { Separator } from "@components/UI/Separator.tsx";
import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";

export interface DividerProps {
  /** Centred text, e.g. a date separator ("Today"). */
  label?: ReactNode;
  className?: string;
}

/** Horizontal rule, optionally with a centred label. */
export const Divider = ({ label, className }: DividerProps) => {
  if (label === undefined || label === null) {
    return <Separator className={className} />;
  }
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-meta font-medium text-muted",
        className,
      )}
    >
      <span aria-hidden="true" className="h-0 flex-1 border-t border-subtle" />
      <span>{label}</span>
      <span aria-hidden="true" className="h-0 flex-1 border-t border-subtle" />
    </div>
  );
};
