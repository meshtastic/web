import { Heading } from "@components/UI/Typography/Heading.tsx";
import { cn } from "@core/utils/cn.ts";
import type React from "react";

interface SidebarSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const SidebarSection = ({
  label,
  children,
  className,
}: SidebarSectionProps) => (
  <div className={cn("px-4 py-2", className)}>
    <Heading
      as="h3"
      className="mb-1 overflow-hidden px-1 text-sm tracking-wider whitespace-nowrap capitalize"
    >
      {label}
    </Heading>

    <div className="space-y-1">{children}</div>
  </div>
);
