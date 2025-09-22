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
}: SidebarSectionProps) => {
  return (
    <div className={cn("py-2", "px-4", className)}>
      <Heading
        as="h3"
        className={cn(
          "mb-2",
          "uppercase tracking-wider text-md",
          "transition-all duration-300 ease-in-out",
          "whitespace-nowrap overflow-hidden",
        )}
      >
        {label}
      </Heading>

      <div className="space-y-1">{children}</div>
    </div>
  );
};
