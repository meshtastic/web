import { cn } from "@core/utils/cn.ts";
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "@tanstack/react-router";

export interface LinkProps extends RouterLinkProps {
  href: string;
  className?: string;
}

export const Link = ({ href, children, className }: LinkProps) => (
  <RouterLink
    to={href}
    target="_blank"
    rel="noopener noreferrer"
    className={cn(
      "font-medium text-accent underline underline-offset-4 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
      className,
    )}
  >
    {children}
  </RouterLink>
);
