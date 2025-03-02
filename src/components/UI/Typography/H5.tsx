import { cn } from "@app/core/utils/cn.ts";

export interface H5Props {
  className?: string;
  children: React.ReactNode;
}

export const H5 = ({ className, children }: H5Props) => (
  <h5
    className={cn("scroll-m-20 text-lg font-medium tracking-tight", className)}
  >
    {children}
  </h5>
);
