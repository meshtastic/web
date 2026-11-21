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
}: SidebarButtonProps) => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className={cn(
      "flex min-h-9 w-full items-center justify-start gap-2 text-wrap",
      // Buttons sit 4px apart, so an offset ring spills onto the next one.
      // Ring only for keyboard focus, drawn inside the button.
      "focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
    )}
    disabled={disabled}
  >
    {Icon && <Icon size={18} className="flex-shrink-0" />}

    {children}

    <span className="flex max-w-full min-w-0 flex-wrap justify-start px-1 text-left text-balance break-all whitespace-normal">
      {label}
    </span>

    {((!active && count && count > 0) || isDirty) && (
      <div
        className={cn(
          "ml-auto flex-shrink-0 justify-end rounded-full px-1.5 py-0.5 text-xs text-white",
          isDirty ? "bg-sky-500" : "bg-blue-500",
        )}
      >
        {count}
      </div>
    )}
  </Button>
);
