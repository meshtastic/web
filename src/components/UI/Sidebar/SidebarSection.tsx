import { cn } from "@app/core/utils/cn";
import { H4 } from "@components/UI/Typography/H4.tsx";
import type { JSX } from "react";

export interface SidebarSectionProps {
  label: string;
  subheader?: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarSection = ({
  label: title,
  children,
  className,
}: SidebarSectionProps): JSX.Element => (
  <div className="px-4 py-2">
    <H4 className="mb-3 ml-2">{title}</H4>
    <div className={cn("space-y-1", className)}>{children}</div>
  </div>
);
