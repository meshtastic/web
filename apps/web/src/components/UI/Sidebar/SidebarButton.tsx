import { Button } from "@components/UI/Button.tsx";
import { useSidebar } from "@core/stores";
import { cn } from "@core/utils/cn.ts";
import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface SidebarButtonProps {
  label: string;
  count?: number;
  active?: boolean;
  Icon?: LucideIcon;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  preventCollapse?: boolean;
  isDirty?: boolean;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  count,
  children,
  onClick,
  disabled = false,
  preventCollapse = false,
  isDirty,
}: SidebarButtonProps) => {
  const { isCollapsed: isSidebarCollapsed } = useSidebar();
  const isButtonCollapsed = isSidebarCollapsed && !preventCollapse;

  return (
    <Button
      onClick={onClick}
      variant={active ? "subtle" : "ghost"}
      size="sm"
      className={cn(
        "flex w-full items-center text-wrap",
        isButtonCollapsed
          ? "justify-center gap-0 px-2 h-9"
          : "justify-start gap-2 min-h-9",
      )}
      disabled={disabled}
    >
      {Icon && (
        <Icon size={isButtonCollapsed ? 20 : 18} className="flex-shrink-0" />
      )}

      {children}

      <span
        className={cn(
          "flex flex-wrap justify-start text-left text-balance break-all",
          "min-w-0",
          "px-1",
          "transition-all duration-300 ease-in-out",
          isButtonCollapsed
            ? "opacity-0 max-w-0 invisible w-0 overflow-hidden"
            : "opacity-100 max-w-full visible whitespace-normal",
        )}
      >
        {label}
      </span>

      {!isButtonCollapsed && ((!active && count && count > 0) || isDirty) && (
        <div
          className={cn(
            "ml-auto flex-shrink-0 justify-end text-white text-xs rounded-full px-1.5 py-0.5",
            "flex-shrink-0",
            "transition-opacity duration-300 ease-in-out",
            isButtonCollapsed ? "opacity-0 invisible" : "opacity-100 visible",
            isDirty ? "bg-sky-500" : "bg-blue-500",
          )}
        >
          {count}
        </div>
      )}
    </Button>
  );
};
