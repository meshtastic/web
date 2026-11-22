import { cn } from "@core/utils/cn.ts";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-raised", className)}
      {...props}
    />
  );
}

export { Skeleton };
