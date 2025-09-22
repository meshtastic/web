import { Button } from "@components/UI/Button.tsx";
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
  isDirty,
}: SidebarButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="sm"
      className={cn(
        "flex w-full items-center text-wrap",
        "justify-start gap-2 min-h-9",
      )}
      disabled={disabled}
    >
      {Icon && <Icon size={18} className="flex-shrink-0" />}

      {children}

      <span
        className={cn(
          "flex flex-wrap justify-start text-left text-balance break-all",
          "min-w-0",
          "px-1",
          "transition-all duration-300 ease-in-out",
          "opacity-100 max-w-full visible whitespace-normal",
        )}
      >
        {label}
      </span>

      {((!active && count && count > 0) || isDirty) && (
        <div
          className={cn(
            "ml-auto flex-shrink-0 justify-end text-white text-xs rounded-full px-1.5 py-0.5",
            "flex-shrink-0",
            "transition-opacity duration-300 ease-in-out",
            isDirty ? "bg-sky-500" : "bg-red-600",
          )}
        >
          {count}
        </div>
      )}
    </Button>
  );
};
