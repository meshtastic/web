import { cn } from "@core/utils/cn.ts";

export interface SubtleProps {
  className?: string;
  children: React.ReactNode;
}

export const Subtle = ({ className, children }: SubtleProps) => (
  <p className={cn("text-sm text-muted", className)}>{children}</p>
);
