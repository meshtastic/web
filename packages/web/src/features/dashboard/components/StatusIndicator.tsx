import { cn } from "@shared/utils/cn";

type StatusType = "online" | "warning" | "offline" | "idle";

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  online: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  offline: "bg-[var(--destructive)]",
  idle: "bg-muted-foreground",
};

export function StatusIndicator({
  status,
  label,
  className,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full",
          statusStyles[status],
          status === "online" && "animate-pulse",
        )}
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </span>
  );
}
