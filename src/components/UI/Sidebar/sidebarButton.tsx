import { Button } from "@components/UI/Button.tsx";
import {LucideMessageSquareDot, type LucideIcon } from "lucide-react";

export interface SidebarButtonProps {
  label: string;
  active?: boolean;
  Icon?: LucideIcon;
  element?: JSX.Element;
  unread: boolean;
  onClick?: () => void;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  element,
  unread,
  onClick,
}: SidebarButtonProps): JSX.Element => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className="w-full justify-start gap-2"
  >
    {Icon && <Icon size={16} />}
    {element && element}
    {label}
    {unread ? 
      <div className="notifyBadge"><LucideMessageSquareDot size={12} /></div>
      : null
    }
  </Button>
);
