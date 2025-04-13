import { Button } from "@components/UI/Button.tsx";
import type { LucideIcon } from "lucide-react";

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
}: SidebarButtonProps) => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className="flex gap-2 w-full"
    disabled={disabled}
  >
    {Icon && <Icon size={16} />}
    {children && children}
    <span className="flex flex-1 justify-start shrink-0">{label}</span>
    {count && count > 0 && !active && <div className="justify-end text-white rounded-[20%] px-[2%] bg-[rgb(195,0,0)]">{count}</div>}
  </Button>
);
