import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";

export interface SectionHeaderProps {
  title: ReactNode;
  /** Heading level for the document outline. */
  as?: "h2" | "h3" | "h4";
  /** Trailing control or note, e.g. an "Add channel" icon button. */
  action?: ReactNode;
  id?: string;
  className?: string;
}

/** Small upper-case group label ("Channels", "Direct messages", "Signal"). */
export const SectionHeader = ({
  title,
  as: Heading = "h2",
  action,
  id,
  className,
}: SectionHeaderProps) => (
  <div
    className={cn("flex min-h-7 items-center justify-between gap-2", className)}
  >
    <Heading
      id={id}
      className="m-0 text-meta font-semibold tracking-[0.06em] text-muted uppercase"
    >
      {title}
    </Heading>
    {action}
  </div>
);
