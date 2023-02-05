import { cn } from "@app/core/utils/cn.js";
import type { LucideIcon } from "lucide-react";

export interface SidebarItemProps {
  icon?: LucideIcon;
  element?: JSX.Element;
  onClick?: () => void;
  active?: boolean;
  label: string;
}

export const SidebarItem = ({
  icon: Icon,
  element,
  onClick,
  active,
  label
}: SidebarItemProps): JSX.Element => (
  <button
    className={cn(
      "text-palette-600 flex w-full cursor-pointer items-center space-x-2.5 rounded-xl bg-transparent px-2.5 py-2.5 transition-all duration-300 hover:text-accent",
      active && "bg-backgroundPrimary text-accent"
    )}
    onClick={() => onClick && onClick()}
  >
    {element}
    {Icon && <Icon size={16} />}
    <span className="align-middle font-mono text-sm">{label}</span>
  </button>
);
