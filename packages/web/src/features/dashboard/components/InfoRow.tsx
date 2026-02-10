import { cn } from "@shared/utils/cn";
import type React from "react";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 border-b border-border/50 last:border-0",
        className,
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground text-right">
        {value}
      </dd>
    </div>
  );
}
