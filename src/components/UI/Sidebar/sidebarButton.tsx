import { Button } from "@components/UI/Button.tsx";
import type { LucideIcon } from "lucide-react";
import type { JSX } from "react";

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
    className="flex gap-2"
  >
    {Icon && <Icon size={16} />}
    {element && element}
    <span className="flex flex-1 justify-start flex-shrink-0">{label}</span>
  </Button>
);
