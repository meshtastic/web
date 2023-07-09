import { cn } from "@app/core/utils/cn.js";

export interface H4Props {
  className?: string;
  children: React.ReactNode;
}

export const H4 = ({ className, children }: H4Props): JSX.Element => (
  <h4
    className={cn(
      "scroll-m-20 text-xl font-semibold tracking-tight",
      className,
    )}
  >
    {children}
  </h4>
);
