import { cn } from "@core/utils/cn";
import {
  Link as RouterLink,
  type LinkProps as RouterLinkProps,
} from "@tanstack/react-router";
import type * as React from "react";

export interface LinkProps extends RouterLinkProps {
  className?: string;
  children?: React.ReactNode;
}

export function Link({ className, ...props }: LinkProps) {
  return (
    <RouterLink
      className={cn("font-medium text-primary", className)}
      {...props}
    />
  );
}
