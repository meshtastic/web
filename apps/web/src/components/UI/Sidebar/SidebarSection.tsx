import { Heading } from "@components/UI/Typography/Heading.tsx";
import { useSidebar } from "@core/stores";
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
  const { isCollapsed } = useSidebar();
  return (
    <div className={cn("py-2", isCollapsed ? "px-0" : "px-4", className)}>
      <Heading
        as="h3"
        className={cn(
          "mb-2",
          "capitalize tracking-wider text-sm",
          "transition-all duration-300 ease-in-out",
          "whitespace-nowrap overflow-hidden",
          isCollapsed
            ? "opacity-0 max-w-0 h-0 invisible px-0 mb-0"
            : "opacity-100 max-w-xs h-auto visible px-1 mb-1",
        )}
      >
        {label}
      </Heading>

      <div className="space-y-1">{children}</div>
    </div>
  );
};
