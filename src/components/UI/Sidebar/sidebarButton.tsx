import React from "react";
import { Button } from "@components/UI/Button.tsx";
import type { LucideIcon } from "lucide-react";
import { cn } from "@core/utils/cn.ts";
import { useSidebar } from "@core/stores/sidebarStore.tsx";

export interface SidebarButtonProps {
  label: string;
  count?: number;
  active?: boolean;
  Icon?: LucideIcon;
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  count,
  children,
  onClick,
  disabled = false,
}: SidebarButtonProps) => {
  const { isCollapsed } = useSidebar();

  return (
    <Button
      onClick={onClick}
      variant={active ? "subtle" : "ghost"}
      size="sm"
      className={cn(
        "flex w-full items-center",
        isCollapsed
          ? 'justify-center gap-0 px-2 h-9'
          : 'justify-start gap-2 min-h-9'
      )}
      disabled={disabled}
    >
      {Icon && (
        <Icon
          size={isCollapsed ? 20 : 18}
          className="flex-shrink-0"
        />
      )}

      {children}

      <span
        className={cn(
          'flex justify-start text-left',
          'transition-all duration-300 ease-in-out',
          isCollapsed
            ? 'opacity-0 max-w-0 invisible flex-1 w-0 whitespace-wrap'
            : 'opacity-100 max-w-full visible flex-1 whitespace-normal'
        )}
      >
        {label}
      </span>

      {!isCollapsed && !active && count && count > 0 && (
        <div
          className={cn(
            "ml-auto flex-shrink-0 justify-end text-white text-xs rounded-full px-1.5 py-0.5 bg-red-600",
            "transition-opacity duration-300 ease-in-out",
            isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'
          )}
        >
          {count}
        </div>
      )}
    </Button>
  );
};