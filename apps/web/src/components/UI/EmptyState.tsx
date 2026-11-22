import { cn } from "@core/utils/cn.ts";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** Icon inside the accent tile; hidden from assistive tech. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Actions or suggestions under the text. */
  children?: ReactNode;
  /** h1 when the empty state is the whole page. */
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
}

/** Centred placeholder for an empty screen or list. */
export const EmptyState = ({
  icon,
  title,
  description,
  children,
  headingLevel: Heading = "h2",
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 text-center",
      className,
    )}
  >
    {icon ? (
      <span
        aria-hidden="true"
        className="flex size-[72px] items-center justify-center rounded-[20px] bg-accent-tint text-accent"
      >
        {icon}
      </span>
    ) : null}
    <div className="flex flex-col gap-2">
      <Heading className="m-0 text-title-lg font-bold text-primary">
        {title}
      </Heading>
      {description ? (
        <p className="m-0 leading-relaxed text-secondary">{description}</p>
      ) : null}
    </div>
    {children}
  </div>
);
