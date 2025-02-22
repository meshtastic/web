import { cn } from "@app/core/utils/cn";

export interface PProps {
  children: React.ReactNode;
  className?: string;
}

export const P = ({ children, className }: PProps) => (
  <p className={cn("leading-7 not-first:mt-6", className)}>{children}</p>
);
