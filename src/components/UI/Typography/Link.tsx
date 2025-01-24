import { cn } from "@app/core/utils/cn";

export interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const Link = ({ href, children, className }: LinkProps): JSX.Element => (
  <a
    href={href}
    target={"_blank"}
    rel="noopener noreferrer"
    className={cn(
      "font-medium text-slate-900 underline underline-offset-4 dark:text-slate-50",
      className,
    )}
  >
    {children}
  </a>
);
