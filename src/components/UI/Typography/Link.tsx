import { cn } from "../../../core/utils/cn.ts";

export interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const Link = ({ href, children, className }: LinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "font-medium text-slate-900 underline underline-offset-4 dark:text-slate-200",
      className,
    )}
  >
    {children}
  </a>
);
