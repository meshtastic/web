import { cn } from "@core/utils/cn.ts";
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "@tanstack/react-router";

export interface LinkProps extends RouterLinkProps {
  href: string;
  children?:
    | React.ReactNode
    | ((state: {
        isActive: boolean;
        isTransitioning: boolean;
      }) => React.ReactNode);
  className?: string;
}

export const Link = ({ href, children, className }: LinkProps) => (
  <RouterLink
    to={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "font-medium text-slate-900 underline underline-offset-4 dark:text-slate-200",
      className,
    )}
  >
    {children}
  </RouterLink>
);
