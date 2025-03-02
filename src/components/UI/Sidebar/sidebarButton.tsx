import { Button } from "@components/UI/Button.tsx";
import type { LucideIcon } from "lucide-react";

export interface SidebarButtonProps {
  label: string;
  active?: boolean;
  Icon?: LucideIcon;
  element?;
  onClick?: () => void;
}

export const SidebarButton = ({
  label,
  active,
  Icon,
  element,
  onClick,
}: SidebarButtonProps) => (
  <Button
    onClick={onClick}
    variant={active ? "subtle" : "ghost"}
    size="sm"
    className="flex gap-2 w-full"
  >
    {Icon && <Icon size={16} />}
    {element && element}
    <span className="flex flex-1 justify-start shrink-0">{label}</span>
  </Button>
);
