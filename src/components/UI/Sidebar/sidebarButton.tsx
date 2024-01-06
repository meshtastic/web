import { Button } from "@components/UI/Button.js";
import type { LucideIcon } from "lucide-react";

export interface SidebarButtonProps {
  label: string;
  active?: boolean;
  Icon?: LucideIcon;
  element?: JSX.Element;
  onClick?: () => void;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  element,
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
  </Button>
);
