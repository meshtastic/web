import { cn } from "@core/utils/cn";
import type * as React from "react";

export function Subtle({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm md:text-base text-muted-foreground", className)}
      {...props}
    />
  );
}
